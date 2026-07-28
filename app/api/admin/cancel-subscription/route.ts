import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { createStripeClient } from "@/lib/stripe-server"
import {
    CANCEL_SUBSCRIPTION_POLICY_MESSAGE,
    SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
    scheduleSubscriptionCancelAtPeriodEnd,
} from "@/lib/subscriptionCancellation"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const body = (await req.json().catch(() => null)) as { userId?: unknown } | null
        const userId = typeof body?.userId === "string" ? body.userId.trim() : ""

        if (!userId) {
            return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: student, error: readErr } = await supabase
            .from("trading_students")
            .select("subscription_id, subscription_status, access_expires_at")
            .eq("id", userId)
            .maybeSingle()

        if (readErr) {
            console.error("[admin/cancel-subscription] fetch student", { userId, error: readErr })
            return NextResponse.json({ ok: false, error: "Database read failed" }, { status: 500 })
        }

        const subscriptionId =
            student &&
            typeof (student as { subscription_id?: unknown }).subscription_id === "string" &&
            String((student as { subscription_id: string }).subscription_id).trim()
                ? String((student as { subscription_id: string }).subscription_id).trim()
                : null

        if (!subscriptionId) {
            return NextResponse.json({ ok: false, error: "No subscription_id for user" }, { status: 400 })
        }

        const currentStatus =
            typeof (student as { subscription_status?: unknown }).subscription_status === "string"
                ? (student as { subscription_status: string }).subscription_status.trim()
                : ""

        if (currentStatus === SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END) {
            const accessUntil =
                typeof (student as { access_expires_at?: unknown }).access_expires_at === "string" &&
                (student as { access_expires_at: string }).access_expires_at.trim()
                    ? (student as { access_expires_at: string }).access_expires_at
                    : null
            return NextResponse.json({
                ok: true,
                subscription_id: subscriptionId,
                status: SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
                access_until: accessUntil,
                message: CANCEL_SUBSCRIPTION_POLICY_MESSAGE,
            })
        }

        const stripe = createStripeClient()
        const { periodEndIso } = await scheduleSubscriptionCancelAtPeriodEnd(stripe, subscriptionId)

        const { error: updateErr } = await supabase
            .from("trading_students")
            .update({ subscription_status: SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END })
            .eq("id", userId)

        if (updateErr) {
            console.error("[admin/cancel-subscription] supabase update failed", {
                userId,
                subscriptionId,
                error: updateErr,
            })
            return NextResponse.json({ ok: false, error: "Database update failed" }, { status: 500 })
        }

        return NextResponse.json({
            ok: true,
            subscription_id: subscriptionId,
            status: SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
            access_until: periodEndIso,
            message: CANCEL_SUBSCRIPTION_POLICY_MESSAGE,
        })
    } catch (error) {
        console.error("[admin/cancel-subscription] unexpected error", error)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
