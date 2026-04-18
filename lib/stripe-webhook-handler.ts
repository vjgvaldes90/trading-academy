import Stripe from "stripe"
import { Resend } from "resend"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { computeRenewalAccessExpiresAtIso } from "@/lib/studentSubscriptionRenewal"

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

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
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

    try {
        console.log("STRIPE EVENT:", JSON.stringify(event, null, 2))
    } catch (stringifyErr) {
        console.log("STRIPE EVENT: (could not JSON.stringify)", stringifyErr)
        console.log("STRIPE EVENT type:", event.type, "id:", event.id)
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session

        try {
            console.log("STRIPE SESSION:", JSON.stringify(session, null, 2))
        } catch (stringifyErr) {
            console.log("STRIPE SESSION: (could not JSON.stringify)", stringifyErr)
            console.log("STRIPE SESSION id:", session.id, "customer_email:", session.customer_email)
        }

        const customerEmail = session.customer_email

        console.log("📧 Email:", customerEmail)

        const rawName = session.customer_details?.name?.trim()
        const displayName = rawName ? escapeHtml(rawName) : ""
        const greetingBlock = displayName
            ? `<p style="margin:0 0 8px 0; color:#374151; font-size:15px;">Hola, <strong style="color:#111827;">${displayName}</strong></p>`
            : `<p style="margin:0 0 8px 0; color:#374151; font-size:15px;">Hola,</p>`

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
        const loginUrl = `${appUrl}/login`

        try {
            if (!customerEmail || typeof customerEmail !== "string" || !customerEmail.trim()) {
                throw new Error("Missing customer_email on session")
            }

            const email = customerEmail.trim().toLowerCase()
            const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase()

            const supabase = createSupabaseServiceRoleClient()

            const { data: savedRow, error: dbErr } = await supabase
                .from("trading_students")
                .upsert(
                    {
                        email,
                        access_code: accessCode,
                        access_type: "paid",
                        is_active: true,
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

            if (!resendApiKey) {
                throw new Error("Missing RESEND_API_KEY")
            }
            const resend = new Resend(resendApiKey)
            await resend.emails.send({
                from: "onboarding@resend.dev",
                to: customerEmail.trim(),
                subject: "Bienvenido a Smart Option Academy",
                html: `
<div style="font-family: Arial, Helvetica, sans-serif; background:#f3f4f6; padding:40px 16px; margin:0;">
  <div style="max-width:520px; margin:0 auto; background:#ffffff; padding:32px 28px; border-radius:12px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.06);">

    <p style="color:#6b7280; font-size:13px; letter-spacing:0.04em; text-transform:uppercase; margin:0 0 4px 0;">Smart Option Academy</p>

    <h2 style="margin:8px 0 18px 0; color:#111827; font-size:22px; font-weight:700; line-height:1.3;">
      Bienvenido a Smart Option Academy 🚀
    </h2>

    ${greetingBlock}

    <p style="margin:0; color:#4b5563; font-size:15px; line-height:1.5;">Tu acceso ya está listo.</p>

    <p style="margin:22px 0 8px 0; color:#374151; font-size:15px;">
      Usa el siguiente código para entrar:
    </p>

    <div style="margin-top:12px; padding:22px 16px; border:2px dashed #d1d5db; border-radius:10px; background:#fafafa; font-size:30px; letter-spacing:10px; font-weight:700; color:#111827; font-family:ui-monospace,Consolas,monospace;">
      <h1 style="margin:0; font-size:inherit; font-weight:inherit; letter-spacing:inherit;">${accessCode}</h1>
    </div>

    <p style="margin-top:26px; font-size:12px; color:#6b7280; line-height:1.5;">
      Este código te permitirá acceder a tu dashboard.
    </p>

    <a href="${loginUrl}" style="display:inline-block; margin-top:26px; padding:12px 32px; background:#111827; color:#ffffff !important; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600;">Ir al login</a>

    <p style="margin-top:20px; font-size:11px; color:#9ca3af;">Si no solicitaste este acceso, puedes ignorar este correo.</p>

  </div>
</div>
`,
            })

            console.log("✅ Email enviado")
        } catch (error) {
            console.error("❌ Error enviando email:", error)
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

    return new Response("OK", { status: 200 })
}
