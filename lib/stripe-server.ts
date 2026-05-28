import Stripe from "stripe"

/** Trim secrets — trailing newlines in Vercel cause StripeConnectionError on API calls. */
export function getStripeSecretKey(): string | null {
    const key = process.env.STRIPE_SECRET_KEY?.trim()
    return key || null
}

export function getStripeWebhookSecret(): string | null {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    return secret || null
}

export function getStripePriceId(): string | null {
    const priceId = process.env.STRIPE_PRICE_ID?.trim()
    return priceId || null
}

export function createStripeClient(): Stripe {
    const key = getStripeSecretKey()
    if (!key) {
        throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    return new Stripe(key, {
        apiVersion: "2026-02-25.clover",
    })
}
