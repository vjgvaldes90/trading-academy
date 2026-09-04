/**
 * Stripe Subscription Schedule helpers for Programa Completo ($450 → $150).
 * from_subscription cannot include phases — create then update.
 */

import type Stripe from "stripe"
import { getStripePriceId, getStripePriceIdFullProgram } from "@/lib/stripe-server"

export type EnsureFullProgramScheduleResult = {
    scheduleId: string
    created: boolean
    reusedExisting: boolean
}

export function getSubscriptionItemPeriodEndUnix(
    subscription: Stripe.Subscription
): number | null {
    const item = subscription.items?.data?.[0]
    if (item && typeof item.current_period_end === "number" && Number.isFinite(item.current_period_end)) {
        return item.current_period_end
    }
    return null
}

export function unixSecondsToIso(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toISOString()
}

export async function ensureFullProgramSubscriptionSchedule(args: {
    stripe: Stripe
    subscriptionId: string
    existingScheduleId?: string | null
}): Promise<EnsureFullProgramScheduleResult> {
    const { stripe, subscriptionId } = args
    const existingScheduleId =
        typeof args.existingScheduleId === "string" && args.existingScheduleId.trim()
            ? args.existingScheduleId.trim()
            : null

    if (existingScheduleId) {
        console.log("[stripe-schedule] reuse DB subscription_schedule_id", {
            subscriptionId,
            scheduleId: existingScheduleId,
        })
        return { scheduleId: existingScheduleId, created: false, reusedExisting: true }
    }

    const fullProgramPriceId = getStripePriceIdFullProgram()
    const tradingPriceId = getStripePriceId()
    if (!fullProgramPriceId) {
        throw new Error("STRIPE_PRICE_ID_FULL_PROGRAM is not configured")
    }
    if (!tradingPriceId) {
        throw new Error("STRIPE_PRICE_ID is not configured (required for schedule phase 2)")
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const attached =
        typeof subscription.schedule === "string" && subscription.schedule.trim()
            ? subscription.schedule.trim()
            : subscription.schedule &&
                typeof subscription.schedule === "object" &&
                "id" in subscription.schedule &&
                typeof (subscription.schedule as { id: string }).id === "string"
              ? (subscription.schedule as { id: string }).id
              : null

    if (attached) {
        console.log("[stripe-schedule] reuse schedule already on subscription", {
            subscriptionId,
            scheduleId: attached,
        })
        return { scheduleId: attached, created: false, reusedExisting: true }
    }

    console.log("[stripe-schedule] creating from_subscription", { subscriptionId })

    const created = await stripe.subscriptionSchedules.create({
        from_subscription: subscriptionId,
        metadata: { plan: "full_program" },
    })

    const currentPhase = created.phases?.[0]
    if (
        !currentPhase ||
        typeof currentPhase.start_date !== "number" ||
        typeof currentPhase.end_date !== "number"
    ) {
        throw new Error(
            `Subscription schedule ${created.id} missing current phase start/end after from_subscription`
        )
    }

    console.log("[stripe-schedule] updating phases ($450 then $150)", {
        subscriptionId,
        scheduleId: created.id,
        phase1Start: currentPhase.start_date,
        phase1End: currentPhase.end_date,
        phase1Price: fullProgramPriceId,
        phase2Price: tradingPriceId,
    })

    const updated = await stripe.subscriptionSchedules.update(created.id, {
        end_behavior: "release",
        proration_behavior: "none",
        metadata: { plan: "full_program" },
        phases: [
            {
                items: [{ price: fullProgramPriceId, quantity: 1 }],
                start_date: currentPhase.start_date,
                end_date: currentPhase.end_date,
            },
            {
                items: [{ price: tradingPriceId, quantity: 1 }],
            },
        ],
    })

    console.log("[stripe-schedule] schedule ready", {
        subscriptionId,
        scheduleId: updated.id,
        phases: updated.phases?.length ?? 0,
    })

    return { scheduleId: updated.id, created: true, reusedExisting: false }
}
