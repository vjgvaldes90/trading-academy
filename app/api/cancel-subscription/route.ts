import { NextResponse } from "next/server"
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
        const body = (await req.json().catch(() => null)) as { email?: unknown } | null
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

        if (!email) {
            return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: student, error: readErr } = await supabase
            .from("trading_students")
            .select("subscription_id, subscription_status, access_expires_at")
            .eq("email", email)
            .maybeSingle()

        if (readErr) {
            console.error("[cancel-subscription] failed to fetch student", { email, error: readErr })
            return NextResponse.json({ ok: false, error: "Database read failed" }, { status: 500 })
        }

        const subscriptionId =
            student && typeof student.subscription_id === "string" && student.subscription_id.trim()
                ? student.subscription_id.trim()
                : null

        if (!subscriptionId) {
            return NextResponse.json({ ok: false, error: "No subscription_id found" }, { status: 400 })
        }

        const currentStatus =
            typeof student?.subscription_status === "string" ? student.subscription_status.trim() : ""
        if (currentStatus === SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END) {
            const accessUntil =
                typeof student?.access_expires_at === "string" && student.access_expires_at.trim()
                    ? student.access_expires_at
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
            .eq("email", email)

        if (updateErr) {
            console.error("[cancel-subscription] failed to update subscription_status", {
                email,
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
        console.error("[cancel-subscription] unexpected error", error)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
