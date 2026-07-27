import { NextResponse } from "next/server"
import Stripe from "stripe"

export const runtime = "nodejs"

/**
 * TEMPORARY debug endpoint — delete after Stripe account verification.
 * GET /api/debug/stripe
 */
export async function GET() {
    try {
        const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
        if (!secretKey) {
            return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 500 })
        }

        const stripe = new Stripe(secretKey)
        const account = await stripe.accounts.retrieve()

        return NextResponse.json({
            accountId: account.id,
            businessName: account.business_profile?.name ?? null,
            email: account.email ?? null,
            country: account.country ?? null,
            priceId: process.env.STRIPE_PRICE_ID ?? null,
            secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 20) ?? null,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
