import { handleStripeWebhook } from "@/lib/stripe-webhook-handler"

export const runtime = "nodejs"

/**
 * Stripe subscription webhooks (raw body + signature verification live in
 * {@link handleStripeWebhook}). Point Stripe’s “Endpoint URL” here or at
 * `/api/webhooks/stripe` — both use the same handler.
 */
export async function POST(req: Request) {
    return handleStripeWebhook(req)
}

/** Health — Stripe only POSTs */
export async function GET() {
    return new Response("OK", { status: 200 })
}
