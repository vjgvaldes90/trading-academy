/**
 * Stripe webhook event idempotency (server-only).
 * Claims event.id before side effects; releases claim on failure so Stripe can retry.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export async function claimStripeWebhookEvent(
    supabase: SupabaseClient,
    eventId: string,
    eventType: string
): Promise<"claimed" | "duplicate"> {
    const { error } = await supabase.from("stripe_webhook_events").insert({
        event_id: eventId,
        event_type: eventType,
    })

    if (!error) {
        return "claimed"
    }

    if (error.code === "23505") {
        console.log("[stripe-webhook] duplicate event skipped", { eventId, eventType })
        return "duplicate"
    }

    console.error("[stripe-webhook] failed to claim event", { eventId, eventType, error })
    throw new Error(`Failed to claim webhook event: ${error.message}`)
}

export async function releaseStripeWebhookEventClaim(
    supabase: SupabaseClient,
    eventId: string
): Promise<void> {
    const { error } = await supabase.from("stripe_webhook_events").delete().eq("event_id", eventId)
    if (error) {
        console.error("[stripe-webhook] failed to release event claim", { eventId, error })
    }
}
