import { handleStripeWebhook } from "@/lib/stripe-webhook-handler"

export const runtime = "nodejs"

export async function POST(req: Request) {
    return handleStripeWebhook(req)
}

/** Browser / health check — Stripe only uses POST */
export async function GET() {
    return new Response("OK", { status: 200 })
}
