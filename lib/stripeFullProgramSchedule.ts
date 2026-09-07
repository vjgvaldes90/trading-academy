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

export function getSubscriptionPrimaryPriceId(
    subscription: Stripe.Subscription
): string | null {
    const item = subscription.items?.data?.[0]
    if (!item) return null
    const price = item.price
    if (price && typeof price === "object" && typeof price.id === "string" && price.id.trim()) {
        return price.id.trim()
    }
    const raw = item as { price?: string | Stripe.Price | null }
    if (typeof raw.price === "string" && raw.price.trim()) {
        return raw.price.trim()
    }
    return null
}

function phaseItemPriceIds(phase: Stripe.SubscriptionSchedule.Phase): string[] {
    const items = phase.items ?? []
    const ids: string[] = []
    for (const item of items) {
        const price = item.price
        if (typeof price === "string" && price.trim()) {
            ids.push(price.trim())
            continue
        }
        if (price && typeof price === "object" && "id" in price) {
            const id = (price as { id?: string }).id
            if (typeof id === "string" && id.trim()) ids.push(id.trim())
        }
    }
    return ids
}

/**
 * Requires at least two phases: phase[0] uses full-program price (bounded),
 * phase[1] uses trading ($150) price (ongoing / no requirement on end_date).
 */
export function schedulePhasesMatchFullProgramTransition(
    schedule: Stripe.SubscriptionSchedule,
    fullProgramPriceId: string,
    tradingPriceId: string
): boolean {
    const phases = schedule.phases ?? []
    if (phases.length < 2) return false

    const phase1Prices = phaseItemPriceIds(phases[0])
    const phase2Prices = phaseItemPriceIds(phases[1])

    if (!phase1Prices.includes(fullProgramPriceId)) return false
    if (!phase2Prices.includes(tradingPriceId)) return false

    const phase1End = phases[0].end_date
    if (typeof phase1End !== "number" || !Number.isFinite(phase1End)) return false

    return true
}

async function assertScheduleConfiguredForFullProgram(args: {
    stripe: Stripe
    scheduleId: string
    subscriptionId: string
    fullProgramPriceId: string
    tradingPriceId: string
}): Promise<Stripe.SubscriptionSchedule> {
    const schedule = await args.stripe.subscriptionSchedules.retrieve(args.scheduleId)
    const ok = schedulePhasesMatchFullProgramTransition(
        schedule,
        args.fullProgramPriceId,
        args.tradingPriceId
    )
    if (!ok) {
        console.error("[stripe-schedule] CRITICAL: existing schedule phases invalid for $450→$150", {
            subscriptionId: args.subscriptionId,
            scheduleId: args.scheduleId,
            phaseCount: schedule.phases?.length ?? 0,
            expectedPhase1Price: args.fullProgramPriceId,
            expectedPhase2Price: args.tradingPriceId,
            status: schedule.status,
        })
        throw new Error(
            `Subscription schedule ${args.scheduleId} does not have valid full_program phases ($450 then $150)`
        )
    }
    return schedule
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

    const fullProgramPriceId = getStripePriceIdFullProgram()
    const tradingPriceId = getStripePriceId()
    if (!fullProgramPriceId) {
        throw new Error("STRIPE_PRICE_ID_FULL_PROGRAM is not configured")
    }
    if (!tradingPriceId) {
        throw new Error("STRIPE_PRICE_ID is not configured (required for schedule phase 2)")
    }

    if (existingScheduleId) {
        await assertScheduleConfiguredForFullProgram({
            stripe,
            scheduleId: existingScheduleId,
            subscriptionId,
            fullProgramPriceId,
            tradingPriceId,
        })
        console.log("[stripe-schedule] reuse DB subscription_schedule_id (validated)", {
            subscriptionId,
            scheduleId: existingScheduleId,
        })
        return { scheduleId: existingScheduleId, created: false, reusedExisting: true }
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
        await assertScheduleConfiguredForFullProgram({
            stripe,
            scheduleId: attached,
            subscriptionId,
            fullProgramPriceId,
            tradingPriceId,
        })
        console.log("[stripe-schedule] reuse schedule already on subscription (validated)", {
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

    const validated = schedulePhasesMatchFullProgramTransition(
        updated,
        fullProgramPriceId,
        tradingPriceId
    )
    if (!validated) {
        console.error("[stripe-schedule] CRITICAL: schedule update did not yield $450→$150 phases", {
            subscriptionId,
            scheduleId: updated.id,
        })
        throw new Error(
            `Subscription schedule ${updated.id} failed validation after phase update ($450→$150)`
        )
    }

    console.log("[stripe-schedule] schedule ready", {
        subscriptionId,
        scheduleId: updated.id,
        phases: updated.phases?.length ?? 0,
    })

    return { scheduleId: updated.id, created: true, reusedExisting: false }
}
