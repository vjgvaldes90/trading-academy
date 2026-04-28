import Stripe from "stripe"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { sendEmail } from "@/lib/sendEmail"
import { computeRenewalAccessExpiresAtIso } from "@/lib/studentSubscriptionRenewal"

function generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function resolveInvoiceCustomerEmail(
    stripe: Stripe,
    invoice: Stripe.Invoice
): Promise<string | null> {
    const direct = invoice.customer_email?.trim().toLowerCase()
    if (direct) return direct

    const c = invoice.customer
    const customerId =
        typeof c === "string" && c.trim()
            ? c
            : c && typeof c === "object" && "deleted" in c && (c as Stripe.DeletedCustomer).deleted
              ? null
              : c && typeof c === "object" && "id" in c && typeof (c as { id: string }).id === "string"
                ? (c as { id: string }).id
                : null

    if (!customerId) return null

    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return null
    const em = "email" in customer ? customer.email?.trim().toLowerCase() : ""
    return em || null
}

/** Email on PaymentIntent: receipt_email, metadata.email, charge billing, or Customer. */
async function resolvePaymentIntentCustomerEmail(
    stripe: Stripe,
    pi: Stripe.PaymentIntent
): Promise<string | null> {
    const receipt = pi.receipt_email?.trim().toLowerCase()
    if (receipt) return receipt

    const meta = typeof pi.metadata?.email === "string" ? pi.metadata.email.trim().toLowerCase() : ""
    if (meta && meta.includes("@")) return meta

    if (typeof pi.latest_charge === "string" && pi.latest_charge) {
        const ch = await stripe.charges.retrieve(pi.latest_charge)
        const em = ch.billing_details?.email?.trim().toLowerCase()
        if (em) return em
    }

    if (typeof pi.customer === "string" && pi.customer) {
        const cu = await stripe.customers.retrieve(pi.customer)
        if (!cu.deleted && "email" in cu && cu.email?.trim()) {
            return cu.email.trim().toLowerCase()
        }
    }

    return null
}

async function resolveSubscriptionIdFromPaymentIntent(
    stripe: Stripe,
    pi: Stripe.PaymentIntent
): Promise<string | null> {
    const invoiceRef = (pi as Stripe.PaymentIntent & { invoice?: string | null }).invoice
    if (typeof invoiceRef !== "string" || !invoiceRef) return null
    const inv = await stripe.invoices.retrieve(invoiceRef)
    const sub = (inv as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
    if (typeof sub === "string" && sub.trim()) return sub
    if (sub && typeof sub === "object" && "id" in sub && typeof (sub as { id: string }).id === "string") {
        return (sub as { id: string }).id
    }
    return null
}

/**
 * Persists paid student row and sends welcome email (access code + magic link). Server-only.
 */
async function fulfillPaidAccessAndSendWelcomeEmail(args: {
    emailForDb: string
    emailForDelivery: string
    accessCode: string
    rawName?: string | null
    subscriptionId: string | null
    resendApiKey: string | undefined
}): Promise<void> {
    const { emailForDb, emailForDelivery, accessCode, rawName, subscriptionId, resendApiKey } = args

    if (!resendApiKey) {
        throw new Error("Missing RESEND_API_KEY")
    }

    const supabase = createSupabaseServiceRoleClient()

    const { data: savedRow, error: dbErr } = await supabase
        .from("trading_students")
        .upsert(
            {
                email: emailForDb,
                access_code: accessCode,
                access_type: "paid",
                is_active: true,
                subscription_id: subscriptionId,
                subscription_status: "active",
            },
            { onConflict: "email" }
        )
        .select("email, access_code")
        .single()

    if (dbErr) {
        console.error("❌ trading_students upsert:", dbErr.message, dbErr.code, dbErr.details)
        throw new Error("Failed to save access code")
    }
    if (!savedRow?.access_code || savedRow.access_code !== accessCode) {
        console.error("❌ trading_students upsert: row mismatch", { savedRow, accessCode })
        throw new Error("Failed to save access code")
    }
    console.log("💾 Saved code:", accessCode)

    console.log("💰 PAYMENT SUCCESS:", emailForDelivery)
    console.log("📧 SENDING EMAIL AFTER PAYMENT")
    const sendResult = await sendEmail(emailForDelivery, accessCode, rawName || undefined)
    if (!sendResult.ok) {
        throw new Error(sendResult.error)
    }

    console.log("✅ Email enviado (Resend)")
}

export async function handleStripeWebhook(req: Request): Promise<Response> {
    console.log("🔥 WEBHOOK START")

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const resendApiKey = process.env.RESEND_API_KEY

    if (!stripeSecretKey || !webhookSecret) {
        console.error("[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET")
        return new Response("Webhook error", { status: 400 })
    }

    let body: string
    try {
        body = await req.text()
    } catch (err) {
        console.error("[stripe-webhook] Failed to read body", err)
        return new Response("Invalid request body", { status: 400 })
    }

    const sig = req.headers.get("stripe-signature")
    if (!sig) {
        return new Response("Missing stripe-signature", { status: 400 })
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-02-25.clover",
    })

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
        console.error("[stripe-webhook] Signature verification failed:", err)
        return new Response("Webhook error", { status: 400 })
    }

    console.log("🔥 WEBHOOK TRIGGERED:", event.type)

    try {
        console.log("STRIPE EVENT:", JSON.stringify(event, null, 2))
    } catch (stringifyErr) {
        console.log("STRIPE EVENT: (could not JSON.stringify)", stringifyErr)
        console.log("STRIPE EVENT type:", event.type, "id:", event.id)
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string | null

        try {
            console.log("STRIPE SESSION:", JSON.stringify(session, null, 2))
        } catch (stringifyErr) {
            console.log("STRIPE SESSION: (could not JSON.stringify)", stringifyErr)
            console.log("STRIPE SESSION id:", session.id, "customer_email:", session.customer_email)
        }

        const customerEmail =
            (typeof session.customer_email === "string" && session.customer_email.trim()
                ? session.customer_email.trim()
                : null) ||
            (typeof session.customer_details?.email === "string" && session.customer_details.email.trim()
                ? session.customer_details.email.trim()
                : null)

        console.log("📧 Email (checkout):", customerEmail)

        const rawName = session.customer_details?.name?.trim()

        try {
            if (!customerEmail) {
                throw new Error("Missing customer_email / customer_details.email on session")
            }

            const emailForDb = customerEmail.toLowerCase()
            const accessCode = generateAccessCode()

            await fulfillPaidAccessAndSendWelcomeEmail({
                emailForDb,
                emailForDelivery: customerEmail,
                accessCode,
                rawName,
                subscriptionId,
                resendApiKey,
            })
        } catch (error) {
            console.error("❌ Error enviando email:", error)
        }
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        try {
            console.log("💰 PAYMENT OBJECT:", paymentIntent)

            const piFull = await stripe.paymentIntents.retrieve(paymentIntent.id, {
                expand: ["latest_charge"],
            })

            const linkedCheckout = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1,
            })

            let email: string | null | undefined =
                piFull.receipt_email?.trim() ||
                (piFull as unknown as { customer_details?: { email?: string | null } }).customer_details?.email?.trim()

            const chargesData = (piFull as unknown as { charges?: { data?: Stripe.Charge[] } }).charges?.data
            if (!email && chargesData?.[0]?.billing_details?.email) {
                email = chargesData[0].billing_details.email.trim()
            }

            if (!email && typeof piFull.latest_charge === "object" && piFull.latest_charge) {
                const ch = piFull.latest_charge as Stripe.Charge
                email = ch.billing_details?.email?.trim() || null
            }

            if (!email && linkedCheckout.data[0]) {
                const sess = await stripe.checkout.sessions.retrieve(linkedCheckout.data[0].id)
                const fromSession =
                    (typeof sess.customer_email === "string" && sess.customer_email.trim()
                        ? sess.customer_email.trim()
                        : null) ||
                    (typeof sess.customer_details?.email === "string" && sess.customer_details.email.trim()
                        ? sess.customer_details.email.trim()
                        : null)
                email = fromSession
            }

            if (!email) {
                email = await resolvePaymentIntentCustomerEmail(stripe, piFull)
            }

            console.log("📧 EXTRACTED EMAIL:", email)

            if (!email) {
                console.error("❌ NO EMAIL FOUND IN PAYMENT")
            } else if (linkedCheckout.data.length > 0) {
                console.log(
                    "[stripe-webhook] payment_intent.succeeded: Checkout linked — DB + sendEmail run from checkout.session.completed (enable that event to avoid missing email)"
                )
            } else {
                const subscriptionId: string | null = await resolveSubscriptionIdFromPaymentIntent(stripe, piFull)

                console.log("📨 CALLING sendEmail...")
                const accessCode = generateAccessCode()
                await fulfillPaidAccessAndSendWelcomeEmail({
                    emailForDb: email.trim().toLowerCase(),
                    emailForDelivery: email.trim(),
                    accessCode,
                    rawName: null,
                    subscriptionId,
                    resendApiKey,
                })
                console.log("✅ sendEmail CALLED SUCCESSFULLY")
            }
        } catch (error) {
            console.error("[stripe-webhook] payment_intent.succeeded handler:", error)
        }
    }

    if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice
        try {
            const email = await resolveInvoiceCustomerEmail(stripe, invoice)
            if (!email) {
                console.warn("[stripe-webhook] invoice.payment_succeeded: no customer email", {
                    invoiceId: invoice.id,
                })
            } else {
                const supabase = createSupabaseServiceRoleClient()
                const { data: row, error: selErr } = await supabase
                    .from("trading_students")
                    .select("access_expires_at")
                    .eq("email", email)
                    .maybeSingle()

                if (selErr) {
                    console.error("[stripe-webhook] invoice.payment_succeeded select:", selErr)
                } else {
                    const accessExpiresAt = computeRenewalAccessExpiresAtIso(
                        (row as { access_expires_at?: string | null } | null)?.access_expires_at
                    )
                    const { error: upErr } = await supabase
                        .from("trading_students")
                        .update({
                            is_active: true,
                            access_expires_at: accessExpiresAt,
                        })
                        .eq("email", email)

                    if (upErr) {
                        console.error("[stripe-webhook] invoice.payment_succeeded update:", upErr)
                    } else {
                        console.log("[stripe-webhook] access extended after invoice payment", { email })
                    }
                }
            }
        } catch (err) {
            console.error("[stripe-webhook] invoice.payment_succeeded handler:", err)
        }
    }

    if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice
        try {
            const email = await resolveInvoiceCustomerEmail(stripe, invoice)
            if (!email) {
                console.warn("[stripe-webhook] invoice.payment_failed: no customer email", {
                    invoiceId: invoice.id,
                })
            } else {
                const supabase = createSupabaseServiceRoleClient()
                const { error: upErr } = await supabase
                    .from("trading_students")
                    .update({ is_active: false })
                    .eq("email", email)

                if (upErr) {
                    console.error("[stripe-webhook] invoice.payment_failed update:", upErr)
                } else {
                    console.log("[stripe-webhook] access deactivated after failed invoice payment", {
                        email,
                    })
                }
            }
        } catch (err) {
            console.error("[stripe-webhook] invoice.payment_failed handler:", err)
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    })
}
