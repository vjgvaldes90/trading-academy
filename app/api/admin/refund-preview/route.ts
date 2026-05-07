import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
})

function formatRefundDisplay(cents: number, currency: string): string {
    const cur = (currency || "usd").trim().toUpperCase() || "USD"
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(cents / 100)
    } catch {
        return `$${(cents / 100).toFixed(2)}`
    }
}

function periodBounds(subscription: Stripe.Subscription): { start: number; end: number } | null {
    const s = subscription as Stripe.Subscription & {
        current_period_start?: number
        current_period_end?: number
    }
    if (typeof s.current_period_start === "number" && typeof s.current_period_end === "number") {
        return { start: s.current_period_start, end: s.current_period_end }
    }
    const item0 = subscription.items?.data?.[0]
    if (item0?.current_period_start != null && item0.current_period_end != null) {
        return { start: item0.current_period_start, end: item0.current_period_end }
    }
    const anchor = subscription.billing_cycle_anchor
    if (typeof anchor === "number") {
        return { start: anchor, end: anchor }
    }
    return null
}

/** Includes `ok` + `refund_display` for admin UI consumers. */
function okJson(
    refundAmount: number,
    currency: string,
    refundCents: number
): NextResponse {
    return NextResponse.json({
        refundAmount,
        currency,
        ok: true,
        refund_amount_cents: refundCents,
        refund_display: formatRefundDisplay(refundCents, currency),
    })
}

export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const userId = new URL(req.url).searchParams.get("userId")?.trim() ?? ""

        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceRoleKey) {
            console.error("[admin/refund-preview] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
            return okJson(0, "usd", 0)
        }

        if (!userId) {
            return okJson(0, "usd", 0)
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
        const { data: student, error: readErr } = await supabase
            .from("trading_students")
            .select("subscription_id")
            .eq("id", userId)
            .maybeSingle()

        if (readErr) {
            console.error("[admin/refund-preview] supabase read", { userId, error: readErr })
            return okJson(0, "usd", 0)
        }

        const subscriptionId =
            student &&
            typeof (student as { subscription_id?: unknown }).subscription_id === "string" &&
            String((student as { subscription_id: string }).subscription_id).trim()
                ? String((student as { subscription_id: string }).subscription_id).trim()
                : null

        if (!subscriptionId) {
            return okJson(0, "usd", 0)
        }

        const subscription = (await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["latest_invoice.payment_intent"],
        })) as Stripe.Subscription

        const bounds = periodBounds(subscription)
        if (!bounds) {
            console.warn("[admin/refund-preview] could not resolve billing period", { userId, subscriptionId })
            return okJson(0, "usd", 0)
        }

        const { start, end } = bounds
        const now = Math.floor(Date.now() / 1000)
        const total = end - start
        const remaining = end - now

        if (remaining <= 0 || total <= 0) {
            return okJson(0, "usd", 0)
        }

        const ratio = remaining / total

        const latestInv = subscription.latest_invoice
        const invoice: Stripe.Invoice | null =
            latestInv && typeof latestInv === "object" ? (latestInv as Stripe.Invoice) : null

        if (!invoice) {
            console.warn("[admin/refund-preview] missing latest_invoice", { userId, subscriptionId })
            return okJson(0, "usd", 0)
        }

        const amountPaid =
            typeof invoice.amount_paid === "number" && Number.isFinite(invoice.amount_paid)
                ? invoice.amount_paid
                : 0

        const currency =
            typeof invoice.currency === "string" && invoice.currency.trim()
                ? invoice.currency.trim().toLowerCase()
                : "usd"

        const refundCents = Math.floor(amountPaid * ratio)
        const refundAmount = refundCents / 100

        return NextResponse.json({
            refundAmount,
            currency,
            ok: true,
            refund_amount_cents: refundCents,
            refund_display: formatRefundDisplay(refundCents, currency),
        })
    } catch (error) {
        console.error("[admin/refund-preview] unexpected error", error)
        return okJson(0, "usd", 0)
    }
}
