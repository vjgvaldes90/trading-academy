import { handleStripeWebhook } from "@/lib/stripe-webhook-handler"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Stripe webhooks — delegates to {@link handleStripeWebhook} (same as `/api/stripe/webhook` and `/api/webhook`).
 * Point Stripe’s endpoint URL here or at `/api/stripe/webhook`; behavior must be identical.
 */
export async function POST(req: Request) {
    return handleStripeWebhook(req)
}

export async function GET() {
    return NextResponse.json({ ok: true }, { status: 200 })
}
