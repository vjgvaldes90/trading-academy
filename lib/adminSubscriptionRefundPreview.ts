import type Stripe from "stripe"

export function paymentIntentIdFromInvoice(invoice: Stripe.Invoice): string | null {
    const list = invoice.payments?.data
    if (Array.isArray(list)) {
        for (const ip of list) {
            const pay = ip.payment
            if (!pay) continue
            if (pay.type === "payment_intent" && pay.payment_intent) {
                const pi = pay.payment_intent
                if (typeof pi === "string" && pi.trim()) return pi.trim()
                if (typeof pi === "object" && pi && "id" in pi && typeof pi.id === "string" && pi.id.trim()) {
                    return pi.id.trim()
                }
            }
            if (pay.type === "charge" && pay.charge && typeof pay.charge === "object" && pay.charge) {
                const ch = pay.charge as Stripe.Charge & { payment_intent?: string | Stripe.PaymentIntent | null }
                const pi = ch.payment_intent
                if (typeof pi === "string" && pi.trim()) return pi.trim()
                if (pi && typeof pi === "object" && "id" in pi && typeof pi.id === "string" && pi.id.trim()) {
                    return pi.id.trim()
                }
            }
        }
    }
    const legacy = invoice as unknown as { payment_intent?: string | Stripe.PaymentIntent | null }
    const pi = legacy.payment_intent
    if (typeof pi === "string" && pi.trim()) return pi.trim()
    if (pi && typeof pi === "object" && "id" in pi && typeof pi.id === "string" && pi.id.trim()) {
        return pi.id.trim()
    }
    return null
}

export function billingPeriodUnix(sub: Stripe.Subscription): { start: number; end: number } {
    const item0 = sub.items?.data?.[0]
    if (item0?.current_period_start != null && item0.current_period_end != null) {
        return { start: item0.current_period_start, end: item0.current_period_end }
    }
    const anchor = sub.billing_cycle_anchor
    return { start: anchor, end: anchor }
}

export type RefundPreviewResult = {
    refund_amount_cents: number
    ratio: number
    amount_paid: number
    currency: string
    payment_intent_id: string | null
}

export function computeRefundPreviewFromSubscription(
    subscription: Stripe.Subscription,
    invoice: Stripe.Invoice | null
): RefundPreviewResult {
    const { start, end } = billingPeriodUnix(subscription)
    const now = Math.floor(Date.now() / 1000)

    const total = end - start
    const remaining = end - now

    let ratio = 0
    if (total > 0 && remaining > 0) {
        ratio = remaining / total
    }

    const amountPaid =
        invoice && typeof invoice.amount_paid === "number" && Number.isFinite(invoice.amount_paid)
            ? invoice.amount_paid
            : 0

    const currency =
        invoice && typeof invoice.currency === "string" && invoice.currency.trim()
            ? invoice.currency.trim().toLowerCase()
            : "usd"

    const refund_amount_cents = Math.floor(amountPaid * ratio)
    const payment_intent_id = invoice ? paymentIntentIdFromInvoice(invoice) : null

    return {
        refund_amount_cents,
        ratio,
        amount_paid: amountPaid,
        currency,
        payment_intent_id,
    }
}
