import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import { createStripeClient } from "@/lib/stripe-server"
import {
    CANCEL_SUBSCRIPTION_POLICY_MESSAGE,
    SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
    scheduleSubscriptionCancelAtPeriodEnd,
} from "@/lib/subscriptionCancellation"

export const runtime = "nodejs"

export async function POST() {
    try {
        // Identity comes from the verified session cookie; a request body cannot target another student.
        const email = await getVerifiedStudentEmailFromCookies()

        if (!email) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: student, error: readErr } = await supabase
            .from("trading_students")
            .select("subscription_id, subscription_status, access_expires_at, subscription_schedule_id")
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

        const subscriptionScheduleId =
            typeof student?.subscription_schedule_id === "string" && student.subscription_schedule_id.trim()
                ? student.subscription_schedule_id.trim()
                : null

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
        const { periodEndIso } = await scheduleSubscriptionCancelAtPeriodEnd(stripe, subscriptionId, {
            subscriptionScheduleId,
        })

        const { error: updateErr } = await supabase
            .from("trading_students")
            .update({
                subscription_status: SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
                subscription_schedule_id: null,
            })
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
