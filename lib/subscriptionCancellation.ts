import type Stripe from "stripe"

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
 */
export async function scheduleSubscriptionCancelAtPeriodEnd(
    stripe: Stripe,
    subscriptionId: string
): Promise<ScheduleCancelAtPeriodEndResult> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
    })

    const periodEnd = subscription.cancel_at
    if (!periodEnd || !Number.isFinite(periodEnd)) {
        throw new Error("Stripe subscription missing cancel_at after scheduling period-end cancellation")
    }

    return {
        subscription,
        periodEndIso: new Date(periodEnd * 1000).toISOString(),
    }
}
