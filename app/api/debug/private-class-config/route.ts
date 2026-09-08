import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * TEMPORARY diagnostics — remove after Private Class env verification.
 * GET /api/debug/private-class-config
 * Never returns secrets or Price IDs.
 */
export async function GET() {
    return NextResponse.json({
        hasPrivateClassPrice: Boolean(process.env.STRIPE_PRICE_ID_PRIVATE_CLASS?.trim()),
        hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        environment: process.env.VERCEL_ENV ?? null,
        deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    })
}
