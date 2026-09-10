/**
 * Shared Stripe Subscription Checkout session creation (server-only).
 * Used by /api/create-checkout and post-launch pre_enrolled validate-code.
 */

import { resolveAppUrl } from "@/lib/app-url"
import { createStripeClient } from "@/lib/stripe-server"
import {
    getStripePriceIdForPlan,
    type SubscriptionPlanId,
} from "@/lib/subscriptionPlans"

export type CreateSubscriptionCheckoutInput = {
    /** Student email from DB / trusted server path — never client-overridden for pre_enrolled. */
    email: string
    plan: SubscriptionPlanId
    userId?: string | null
    sessionId?: string | null
}

export type CreateSubscriptionCheckoutSuccess = {
    ok: true
    url: string
    plan: SubscriptionPlanId
    sessionId: string
    success_url: string
    cancel_url: string
    appUrl: string
    appUrlSource: string
}

export type CreateSubscriptionCheckoutFailure = {
    ok: false
    error: string
    code?: string
    plan?: SubscriptionPlanId
    status: number
    details?: Record<string, unknown>
}

export type CreateSubscriptionCheckoutResult =
    | CreateSubscriptionCheckoutSuccess
    | CreateSubscriptionCheckoutFailure

export async function createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutInput
): Promise<CreateSubscriptionCheckoutResult> {
    const emailRaw = input.email.trim()
    if (!emailRaw) {
        return { ok: false, error: "Email requerido", status: 400 }
    }
    const emailForDb = emailRaw.toLowerCase()
    const plan = input.plan

    const priceResolved = getStripePriceIdForPlan(plan)
    if (!priceResolved.ok) {
        const status = priceResolved.code === "missing_full_program_price" ? 503 : 500
        return {
            ok: false,
            error: priceResolved.error,
            code: priceResolved.code,
            plan: priceResolved.plan,
            status,
        }
    }
    const priceId = priceResolved.priceId

    const resolved = resolveAppUrl()
    const DOMAIN = resolved.url
    const success_url = `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancel_url = `${DOMAIN}/`

    const metadata: Record<string, string> = {
        email: emailForDb,
        plan,
    }
    if (input.userId) metadata.user_id = input.userId
    if (input.sessionId) metadata.trading_session_id = input.sessionId

    const stripe = createStripeClient()
    const lineItems = [{ price: priceId, quantity: 1 }]

    try {
        await stripe.prices.retrieve(priceId)
    } catch (priceErr: unknown) {
        console.error("[checkout] prices.retrieve FAILED:", priceErr)
        const stripeErr = priceErr as {
            message?: string
            type?: string
            code?: string
            statusCode?: number
            raw?: unknown
            rawType?: string
        }
        return {
            ok: false,
            error: "Stripe prices.retrieve failed",
            status: 500,
            plan,
            details: {
                message:
                    stripeErr.message ??
                    (priceErr instanceof Error ? priceErr.message : String(priceErr)),
                type: stripeErr.type ?? null,
                code: stripeErr.code ?? null,
                statusCode: stripeErr.statusCode ?? null,
                rawType: stripeErr.rawType ?? null,
                raw: stripeErr.raw ?? null,
                debug: {
                    plan,
                    serverSelectedPriceId: priceId,
                    line_items: lineItems,
                    apiVersion: "2026-02-25.clover",
                },
            },
        }
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: emailRaw,
        metadata,
        subscription_data: {
            metadata: {
                plan,
                email: emailForDb,
            },
        },
        line_items: lineItems,
        success_url,
        cancel_url,
    })

    if (!session.url) {
        return {
            ok: false,
            error: "Stripe Checkout session missing url",
            status: 500,
            plan,
        }
    }

    console.log("[checkout] Stripe session created", {
        id: session.id,
        plan,
        stripe_checkout_url: session.url,
    })

    return {
        ok: true,
        url: session.url,
        plan,
        sessionId: session.id,
        success_url,
        cancel_url,
        appUrl: DOMAIN,
        appUrlSource: resolved.source,
    }
}
