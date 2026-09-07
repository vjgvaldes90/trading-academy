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

/** Solo Trading ($150/mo) — existing production price. */
export function getStripePriceId(): string | null {
    const priceId = process.env.STRIPE_PRICE_ID?.trim()
    return priceId || null
}

/**
 * Programa Completo intro price ($450 first month).
 * Optional until the Stripe Price is created; missing must not break trading_only.
 */
export function getStripePriceIdFullProgram(): string | null {
    const priceId = process.env.STRIPE_PRICE_ID_FULL_PROGRAM?.trim()
    return priceId || null
}

/**
 * Private Class 1:1 one-time price ($250).
 * Never fall back to subscription Price IDs.
 */
export function getStripePriceIdPrivateClass(): string | null {
    const priceId = process.env.STRIPE_PRICE_ID_PRIVATE_CLASS?.trim()
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
