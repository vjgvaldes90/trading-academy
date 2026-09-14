import type Stripe from "stripe"
import {
    getSubscriptionItemPeriodEndUnix,
    unixSecondsToIso,
} from "@/lib/stripeFullProgramSchedule"

/** DB `subscription_status` while Stripe subscription is active but set to end at period close. */
export const SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END = "cancel_at_period_end"

export const CANCEL_SUBSCRIPTION_POLICY_MESSAGE =
    "No refunds are issued. Access remains available until the end of the current paid billing period."

export type ScheduleCancelAtPeriodEndResult = {
    subscription: Stripe.Subscription
    periodEndIso: string
}

/**
 * Stop future renewals without revoking access immediately.
 * Stripe keeps the subscription `active` until `current_period_end`.
 * With `cancel_at_period_end: true`, Stripe leaves `cancel_at` null — use item period end.
 */
export async function scheduleSubscriptionCancelAtPeriodEnd(
    stripe: Stripe,
    subscriptionId: string
): Promise<ScheduleCancelAtPeriodEndResult> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
    })

    const periodEnd = getSubscriptionItemPeriodEndUnix(subscription)
    if (!periodEnd) {
        throw new Error(
            "Stripe subscription missing current_period_end after scheduling period-end cancellation"
        )
    }

    return {
        subscription,
        periodEndIso: unixSecondsToIso(periodEnd),
    }
}
