import Stripe from "stripe"
import {
    createStripeClient,
    getStripePriceId,
    getStripePriceIdFullProgram,
    getStripeSecretKey,
    getStripeWebhookSecret,
} from "@/lib/stripe-server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    notifyNewStudentCreated,
    tradingStudentExistsByEmail,
} from "@/lib/adminNotifications"
import { sendEmail } from "@/lib/sendEmail"
import { computeRenewalAccessExpiresAtIso } from "@/lib/studentSubscriptionRenewal"
import { SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END } from "@/lib/subscriptionCancellation"
import {
    isValidSubscriptionPlan,
    resolveSubscriptionPlan,
    type SubscriptionPlanId,
} from "@/lib/subscriptionPlans"
import {
    ensureFullProgramSubscriptionSchedule,
    getSubscriptionItemPeriodEndUnix,
    getSubscriptionItemPeriodStartUnix,
    getSubscriptionPrimaryPriceId,
    unixSecondsToIso,
} from "@/lib/stripeFullProgramSchedule"
import {
    claimStripeWebhookEvent,
    releaseStripeWebhookEventClaim,
} from "@/lib/stripeWebhookIdempotency"
import {
    handlePrivateClassCheckoutPaidEvent,
    isPrivateClassCheckoutSession,
} from "@/lib/privateClassStripe"

function generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function maskAccessCode(code: string): string {
    if (code.length <= 2) return "**"
    return `${code.slice(0, 1)}***${code.slice(-1)}`
}

function planFromMetadata(meta: Stripe.Metadata | null | undefined): SubscriptionPlanId {
    const raw = typeof meta?.plan === "string" ? meta.plan : null
    if (raw && isValidSubscriptionPlan(raw.trim().toLowerCase())) {
        return raw.trim().toLowerCase() as SubscriptionPlanId
    }
    return "trading_only"
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

function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const sub = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
    if (typeof sub === "string" && sub.trim()) return sub.trim()
    if (sub && typeof sub === "object" && "id" in sub && typeof (sub as { id: string }).id === "string") {
        return (sub as { id: string }).id
    }
    return null
}

async function resolveAccessExpiresAtFromInvoice(
    stripe: Stripe,
    invoice: Stripe.Invoice,
    currentExpiresAt: string | null | undefined
): Promise<string> {
    const linePeriodEnd = invoice.lines?.data?.[0]?.period?.end
    if (typeof linePeriodEnd === "number" && Number.isFinite(linePeriodEnd) && linePeriodEnd > 0) {
        return unixSecondsToIso(linePeriodEnd)
    }

    const subscriptionId = resolveInvoiceSubscriptionId(invoice)
    if (subscriptionId) {
        try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            const periodEnd = getSubscriptionItemPeriodEndUnix(sub)
            if (periodEnd) {
                return unixSecondsToIso(periodEnd)
            }
        } catch (err) {
            console.error("[stripe-webhook] failed to load subscription for period end", {
                subscriptionId,
                err,
            })
        }
    }

    return computeRenewalAccessExpiresAtIso(currentExpiresAt)
}

async function updateStudentBySubscriptionId(
    subscriptionId: string,
    patch: Record<string, unknown>
): Promise<void> {
    const supabase = createSupabaseServiceRoleClient()
    const { error } = await supabase
        .from("trading_students")
        .update(patch)
        .eq("subscription_id", subscriptionId)

    if (error) {
        console.error("[stripe-webhook] trading_students update by subscription_id failed", {
            subscriptionId,
            patchKeys: Object.keys(patch),
            error,
        })
    }
}

type StudentPlanRow = {
    id: string | null
    access_code: string | null
    subscription_schedule_id: string | null
    plan: string | null
    theory_quota_period_start?: string | null
    theory_quota_period_end?: string | null
}

async function fulfillPaidAccess(args: {
    stripe: Stripe
    emailForDb: string
    emailForDelivery: string
    rawName?: string | null
    subscriptionId: string | null
    plan: SubscriptionPlanId
    resendApiKey: string | undefined
    eventId?: string | null
}): Promise<void> {
    const {
        stripe,
        emailForDb,
        emailForDelivery,
        rawName,
        subscriptionId,
        plan,
        resendApiKey,
        eventId,
    } = args

    if (!resendApiKey) {
        throw new Error("Missing RESEND_API_KEY")
    }

    const supabase = createSupabaseServiceRoleClient()
    const existed = await tradingStudentExistsByEmail(supabase, emailForDb)

    const { data: existingRow, error: existingErr } = await supabase
        .from("trading_students")
        .select(
            "id, access_code, subscription_schedule_id, plan, theory_quota_period_start, theory_quota_period_end"
        )
        .eq("email", emailForDb)
        .maybeSingle()

    if (existingErr) {
        console.error("[stripe-webhook] existing student lookup failed", existingErr)
        throw new Error("Failed to load existing student")
    }

    const existing = existingRow as StudentPlanRow | null
    const existingCode =
        typeof existing?.access_code === "string" && existing.access_code.trim()
            ? existing.access_code.trim()
            : null
    const accessCode = existingCode ?? generateAccessCode()
    const isNewAccessCode = !existingCode

    let programTheoryUntil: string | null = null
    let theoryQuotaPeriodStart: string | null = null
    let theoryQuotaPeriodEnd: string | null = null
    const stripePriceId: string | null =
        plan === "full_program" ? getStripePriceIdFullProgram() : getStripePriceId()
    let subscriptionScheduleId: string | null =
        typeof existing?.subscription_schedule_id === "string" && existing.subscription_schedule_id.trim()
            ? existing.subscription_schedule_id.trim()
            : null
    let accessExpiresAt: string | null = null

    if (subscriptionId) {
        try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            const periodStartUnix = getSubscriptionItemPeriodStartUnix(sub)
            const periodEndUnix = getSubscriptionItemPeriodEndUnix(sub)
            if (periodEndUnix) {
                accessExpiresAt = unixSecondsToIso(periodEndUnix)
                if (plan === "full_program") {
                    programTheoryUntil = accessExpiresAt
                    if (periodStartUnix && periodEndUnix > periodStartUnix) {
                        theoryQuotaPeriodStart = unixSecondsToIso(periodStartUnix)
                        theoryQuotaPeriodEnd = unixSecondsToIso(periodEndUnix)
                    }
                }
            }
        } catch (err) {
            console.error("[stripe-webhook] subscription retrieve for period failed", {
                subscriptionId,
                err,
            })
        }
    }

    if (plan === "full_program") {
        if (!subscriptionId) {
            console.error("[stripe-webhook] CRITICAL: full_program without subscription_id", {
                email: emailForDb,
                eventId: eventId ?? null,
            })
            throw new Error("full_program fulfillment requires subscription_id")
        }

        try {
            const scheduleResult = await ensureFullProgramSubscriptionSchedule({
                stripe,
                subscriptionId,
                existingScheduleId: subscriptionScheduleId,
            })
            subscriptionScheduleId = scheduleResult.scheduleId
            console.log("[stripe-webhook] full_program schedule ensured", {
                subscriptionId,
                scheduleId: subscriptionScheduleId,
                created: scheduleResult.created,
                reusedExisting: scheduleResult.reusedExisting,
                programTheoryUntil,
                eventId: eventId ?? null,
            })
        } catch (scheduleErr) {
            const scheduleMessage =
                scheduleErr instanceof Error ? scheduleErr.message : String(scheduleErr)
            console.error("[stripe-webhook] CRITICAL: full_program schedule creation/validation failed", {
                email: emailForDb,
                subscriptionId,
                plan,
                eventId: eventId ?? null,
                error: scheduleMessage,
            })

            // Reconciliation marker — do NOT grant a silent valid full_program ($450 forever).
            // No auto-refund / auto-cancel. Webhook throws so Stripe can retry.
            const reconcilePayload: Record<string, unknown> = {
                email: emailForDb,
                access_code: accessCode,
                access_type: "paid",
                is_active: false,
                subscription_id: subscriptionId,
                subscription_status: "schedule_error",
                plan: "full_program",
                stripe_price_id: stripePriceId,
                program_theory_until: null,
            }
            if (accessExpiresAt) {
                reconcilePayload.access_expires_at = accessExpiresAt
            }

            const { error: reconcileErr } = await supabase
                .from("trading_students")
                .upsert(reconcilePayload, { onConflict: "email" })

            if (reconcileErr) {
                console.error(
                    "[stripe-webhook] CRITICAL: failed to persist schedule_error reconciliation row",
                    {
                        email: emailForDb,
                        subscriptionId,
                        eventId: eventId ?? null,
                        error: reconcileErr,
                    }
                )
            }

            throw new Error(
                `full_program schedule not configured (subscription_id=${subscriptionId}): ${scheduleMessage}`
            )
        }
    }

    const upsertPayload: Record<string, unknown> = {
        email: emailForDb,
        access_code: accessCode,
        access_type: "paid",
        is_active: true,
        subscription_id: subscriptionId,
        subscription_status: "active",
        plan,
        stripe_price_id: stripePriceId,
    }

    if (accessExpiresAt) {
        upsertPayload.access_expires_at = accessExpiresAt
    }

    if (plan === "full_program") {
        if (programTheoryUntil) {
            upsertPayload.program_theory_until = programTheoryUntil
        }
        if (subscriptionScheduleId) {
            upsertPayload.subscription_schedule_id = subscriptionScheduleId
        }
        // Persist first $450 window once — never overwrite on later fulfillments.
        const alreadyHasQuotaPeriod =
            typeof existing?.theory_quota_period_start === "string" &&
            Boolean(existing.theory_quota_period_start.trim())
        if (!alreadyHasQuotaPeriod && theoryQuotaPeriodStart && theoryQuotaPeriodEnd) {
            upsertPayload.theory_quota_period_start = theoryQuotaPeriodStart
            upsertPayload.theory_quota_period_end = theoryQuotaPeriodEnd
        }
    } else {
        upsertPayload.program_theory_until = null
    }

    const { data: savedRow, error: dbErr } = await supabase
        .from("trading_students")
        .upsert(upsertPayload, { onConflict: "email" })
        .select("id, email, access_code")
        .single()

    if (dbErr) {
        console.error("❌ trading_students upsert:", dbErr.message, dbErr.code, dbErr.details)
        throw new Error("Failed to save access code")
    }
    if (!savedRow?.access_code || savedRow.access_code !== accessCode) {
        console.error("❌ trading_students upsert: row mismatch", {
            savedId: savedRow?.id,
            expectedMasked: maskAccessCode(accessCode),
        })
        throw new Error("Failed to save access code")
    }

    if (!existed) {
        await notifyNewStudentCreated(supabase, {
            email: emailForDb,
            studentId: typeof savedRow.id === "string" ? savedRow.id : null,
            name: rawName ?? null,
        })
    }

    console.log("[stripe-webhook] student fulfilled", {
        email: emailForDb,
        plan,
        subscriptionId,
        scheduleId: subscriptionScheduleId,
        programTheoryUntil,
        accessExpiresAt,
        reusedAccessCode: !isNewAccessCode,
        codeMasked: maskAccessCode(accessCode),
        eventId: eventId ?? null,
    })

    if (isNewAccessCode) {
        console.log("📧 SENDING EMAIL AFTER PAYMENT")
        const sendResult = await sendEmail(emailForDelivery, accessCode, rawName || undefined)
        if (!sendResult.ok) {
            console.error(
                "[stripe-webhook] welcome email failed after fulfill (manual resend may be needed)",
                { email: emailForDb, error: sendResult.error }
            )
        } else {
            console.log("✅ Email enviado (Resend)")
        }
    } else {
        console.log("[stripe-webhook] welcome email skipped (existing access_code)", {
            email: emailForDb,
        })
    }
}

export async function handleStripeWebhook(req: Request): Promise<Response> {
    console.log("🔥 WEBHOOK START")

    const stripeSecretKey = getStripeSecretKey()
    const webhookSecret = getStripeWebhookSecret()
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

    const stripe = createStripeClient()

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
        console.error("[stripe-webhook] Signature verification failed:", err)
        return new Response("Webhook error", { status: 400 })
    }

    console.log("🔥 WEBHOOK TRIGGERED:", event.type, event.id)

    const supabase = createSupabaseServiceRoleClient()
    let claim: "claimed" | "duplicate"
    try {
        claim = await claimStripeWebhookEvent(supabase, event.id, event.type)
    } catch (claimErr) {
        console.error("[stripe-webhook] idempotency claim failed", claimErr)
        return new Response("Webhook claim error", { status: 500 })
    }

    if (claim === "duplicate") {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session

            if (isPrivateClassCheckoutSession(session)) {
                console.log("[stripe-webhook] private_class checkout.session.completed", {
                    sessionId: session.id,
                    payment_status: session.payment_status,
                    mode: session.mode,
                    requestId: session.metadata?.private_class_request_id ?? null,
                })
                await handlePrivateClassCheckoutPaidEvent({
                    supabase,
                    session,
                    source: "checkout.session.completed",
                })
            } else {
                const subscriptionId =
                    typeof session.subscription === "string" && session.subscription.trim()
                        ? session.subscription.trim()
                        : null

                const customerEmail =
                    (typeof session.customer_email === "string" && session.customer_email.trim()
                        ? session.customer_email.trim()
                        : null) ||
                    (typeof session.customer_details?.email === "string" &&
                    session.customer_details.email.trim()
                        ? session.customer_details.email.trim()
                        : null)

                console.log("[stripe-webhook] checkout.session.completed", {
                    sessionId: session.id,
                    subscriptionId,
                    planMeta: session.metadata?.plan ?? null,
                })

                if (!customerEmail) {
                    throw new Error("Missing customer_email / customer_details.email on session")
                }

                await fulfillPaidAccess({
                    stripe,
                    emailForDb: customerEmail.toLowerCase(),
                    emailForDelivery: customerEmail,
                    rawName: session.customer_details?.name?.trim() ?? null,
                    subscriptionId,
                    plan: planFromMetadata(session.metadata),
                    resendApiKey,
                    eventId: event.id,
                })
            }
        } else if (event.type === "checkout.session.async_payment_succeeded") {
            const session = event.data.object as Stripe.Checkout.Session
            if (isPrivateClassCheckoutSession(session)) {
                console.log("[stripe-webhook] private_class checkout.session.async_payment_succeeded", {
                    sessionId: session.id,
                    requestId: session.metadata?.private_class_request_id ?? null,
                })
                await handlePrivateClassCheckoutPaidEvent({
                    supabase,
                    session,
                    source: "checkout.session.async_payment_succeeded",
                })
            } else {
                console.log(
                    "[stripe-webhook] checkout.session.async_payment_succeeded ignored (not private_class)",
                    { sessionId: session.id }
                )
            }
        } else if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            const piFull = await stripe.paymentIntents.retrieve(paymentIntent.id, {
                expand: ["latest_charge"],
            })

            const linkedCheckout = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1,
            })

            if (linkedCheckout.data.length > 0) {
                console.log(
                    "[stripe-webhook] payment_intent.succeeded: Checkout linked — skip fulfill (checkout.session.completed owns fulfillment + schedule)"
                )
            } else {
                let email: string | null | undefined =
                    piFull.receipt_email?.trim() ||
                    (
                        piFull as unknown as { customer_details?: { email?: string | null } }
                    ).customer_details?.email?.trim()

                const chargesData = (piFull as unknown as { charges?: { data?: Stripe.Charge[] } })
                    .charges?.data
                if (!email && chargesData?.[0]?.billing_details?.email) {
                    email = chargesData[0].billing_details.email.trim()
                }

                if (!email && typeof piFull.latest_charge === "object" && piFull.latest_charge) {
                    const ch = piFull.latest_charge as Stripe.Charge
                    email = ch.billing_details?.email?.trim() || null
                }

                if (!email) {
                    email = await resolvePaymentIntentCustomerEmail(stripe, piFull)
                }

                if (!email) {
                    console.error("❌ NO EMAIL FOUND IN PAYMENT")
                } else {
                    const subscriptionId = await resolveSubscriptionIdFromPaymentIntent(stripe, piFull)
                    let plan: SubscriptionPlanId = "trading_only"
                    if (subscriptionId) {
                        try {
                            const sub = await stripe.subscriptions.retrieve(subscriptionId)
                            plan = planFromMetadata(sub.metadata)
                        } catch (err) {
                            console.warn(
                                "[stripe-webhook] could not load subscription metadata for PI fallback",
                                err
                            )
                        }
                    }

                    await fulfillPaidAccess({
                        stripe,
                        emailForDb: email.trim().toLowerCase(),
                        emailForDelivery: email.trim(),
                        rawName: null,
                        subscriptionId,
                        plan,
                        resendApiKey,
                        eventId: event.id,
                    })
                }
            }
        } else if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice
            const email = await resolveInvoiceCustomerEmail(stripe, invoice)
            if (!email) {
                console.warn("[stripe-webhook] invoice.payment_succeeded: no customer email", {
                    invoiceId: invoice.id,
                })
            } else {
                const { data: row, error: selErr } = await supabase
                    .from("trading_students")
                    .select(
                        "access_expires_at, plan, program_theory_until, stripe_price_id, subscription_status, subscription_id, subscription_schedule_id"
                    )
                    .eq("email", email)
                    .maybeSingle()

                if (selErr) {
                    console.error("[stripe-webhook] invoice.payment_succeeded select:", selErr)
                    throw new Error("Failed to load student for invoice renewal")
                }

                const subscriptionStatus =
                    typeof (row as { subscription_status?: string | null } | null)
                        ?.subscription_status === "string"
                        ? (row as { subscription_status: string }).subscription_status.trim()
                        : ""

                if (subscriptionStatus === "schedule_error") {
                    console.error(
                        "[stripe-webhook] CRITICAL: invoice.payment_succeeded ignored — student in schedule_error (blocked until schedule reconciliation)",
                        {
                            email,
                            invoiceId: invoice.id,
                            subscriptionId:
                                (row as { subscription_id?: string | null } | null)?.subscription_id ??
                                resolveInvoiceSubscriptionId(invoice),
                            subscriptionScheduleId:
                                (row as { subscription_schedule_id?: string | null } | null)
                                    ?.subscription_schedule_id ?? null,
                            eventId: event.id,
                        }
                    )
                    // Do not reactivate is_active, do not touch program_theory_until / schedule_id.
                } else {
                    const accessExpiresAt = await resolveAccessExpiresAtFromInvoice(
                        stripe,
                        invoice,
                        (row as { access_expires_at?: string | null } | null)?.access_expires_at
                    )

                    const patch: Record<string, unknown> = {
                        is_active: true,
                        access_expires_at: accessExpiresAt,
                    }

                    // Sync stripe_price_id to live subscription price ($150 after schedule phase 2).
                    // Do not touch program_theory_until — theory stays closed after first period.
                    const subscriptionId = resolveInvoiceSubscriptionId(invoice)
                    if (subscriptionId) {
                        try {
                            const sub = await stripe.subscriptions.retrieve(subscriptionId)
                            const livePriceId = getSubscriptionPrimaryPriceId(sub)
                            if (livePriceId) {
                                patch.stripe_price_id = livePriceId
                            }
                            if (sub.status === "active" && !sub.cancel_at_period_end) {
                                patch.subscription_status = "active"
                            }
                        } catch (subErr) {
                            console.error(
                                "[stripe-webhook] invoice.payment_succeeded: subscription price sync failed",
                                {
                                    email,
                                    subscriptionId,
                                    eventId: event.id,
                                    error: subErr instanceof Error ? subErr.message : String(subErr),
                                }
                            )
                        }
                    }

                    const { error: upErr } = await supabase
                        .from("trading_students")
                        .update(patch)
                        .eq("email", email)

                    if (upErr) {
                        console.error("[stripe-webhook] invoice.payment_succeeded update:", upErr)
                        throw new Error("Failed to extend access after invoice payment")
                    }

                    console.log("[stripe-webhook] access extended after invoice payment", {
                        email,
                        accessExpiresAt,
                        stripePriceId:
                            typeof patch.stripe_price_id === "string" ? patch.stripe_price_id : null,
                        plan: (row as { plan?: string | null } | null)?.plan ?? null,
                        programTheoryUntil:
                            (row as { program_theory_until?: string | null } | null)
                                ?.program_theory_until ?? null,
                        resolvedPlan: resolveSubscriptionPlan(
                            (row as { plan?: string | null } | null)?.plan
                        ),
                        eventId: event.id,
                    })
                }
            }
        } else if (event.type === "invoice.payment_failed") {
            const invoice = event.data.object as Stripe.Invoice
            const email = await resolveInvoiceCustomerEmail(stripe, invoice)
            if (!email) {
                console.warn("[stripe-webhook] invoice.payment_failed: no customer email", {
                    invoiceId: invoice.id,
                })
            } else {
                const { error: upErr } = await supabase
                    .from("trading_students")
                    .update({ is_active: false })
                    .eq("email", email)

                if (upErr) {
                    console.error("[stripe-webhook] invoice.payment_failed update:", upErr)
                    throw new Error("Failed to deactivate after failed invoice")
                }

                console.log("[stripe-webhook] access deactivated after failed invoice payment", {
                    email,
                })
            }
        } else if (event.type === "customer.subscription.updated") {
            const subscription = event.data.object as Stripe.Subscription
            const subscriptionId = subscription.id
            if (subscription.cancel_at_period_end) {
                await updateStudentBySubscriptionId(subscriptionId, {
                    subscription_status: SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
                })
                console.log("[stripe-webhook] subscription scheduled to cancel at period end", {
                    subscriptionId,
                })
            } else if (subscription.status === "active") {
                await updateStudentBySubscriptionId(subscriptionId, {
                    subscription_status: "active",
                })
            }
        } else if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription
            await updateStudentBySubscriptionId(subscription.id, {
                subscription_status: "cancelled",
                is_active: false,
            })
            console.log("[stripe-webhook] subscription ended — access deactivated", {
                subscriptionId: subscription.id,
                eventId: event.id,
            })
        } else if (
            event.type === "subscription_schedule.updated" ||
            event.type === "subscription_schedule.completed" ||
            event.type === "subscription_schedule.released"
        ) {
            const schedule = event.data.object as Stripe.SubscriptionSchedule
            console.log("[stripe-webhook] subscription_schedule event", {
                type: event.type,
                scheduleId: schedule.id,
                status: schedule.status,
            })
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    } catch (err) {
        console.error("[stripe-webhook] handler failed — releasing event claim for retry", {
            eventId: event.id,
            type: event.type,
            err,
        })
        await releaseStripeWebhookEventClaim(supabase, event.id)
        return new Response("Webhook handler error", { status: 500 })
    }
}
