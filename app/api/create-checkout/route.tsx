import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/app-url"
import { createStripeClient, getStripePriceId, getStripeSecretKey } from "@/lib/stripe-server"

export const runtime = "nodejs"

// IMPORTANT:
// Do NOT create live-session reservations here.
// Live join happens only from the dashboard via secure join.

export async function POST(req: Request) {
    console.log("Stripe key exists:", !!getStripeSecretKey())
    console.log("Price ID:", getStripePriceId())

    try {
        const priceId = getStripePriceId()
        if (!priceId) {
            return NextResponse.json({ error: "STRIPE_PRICE_ID is not configured" }, { status: 500 })
        }

        const body = (await req.json().catch(() => null)) as {
            email?: unknown
            userId?: unknown
            sessionId?: unknown
        } | null
        const email = typeof body?.email === "string" ? body.email.trim() : ""
        const userId =
            typeof body?.userId === "string" && body.userId.trim().length > 0
                ? body.userId.trim()
                : null
        const sessionId =
            typeof body?.sessionId === "string" && body.sessionId.trim().length > 0
                ? body.sessionId.trim()
                : null

        if (!email) {
            return NextResponse.json({ error: "Email requerido" }, { status: 400 })
        }

        const DOMAIN = getAppUrl()
        const success_url = `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`
        const cancel_url = `${DOMAIN}/`

        const metadata: Record<string, string> = {
            email: email.toLowerCase(),
        }
        if (userId) {
            metadata.user_id = userId
        }
        if (sessionId) {
            metadata.trading_session_id = sessionId
        }

        const stripe = createStripeClient()

        const lineItems = [
            {
                price: priceId,
                quantity: 1,
            },
        ]

        // TEMPORARY debug — remove after Price ID diagnosis
        console.log("[checkout debug] process.env.STRIPE_PRICE_ID:", process.env.STRIPE_PRICE_ID)
        console.log("[checkout debug] getStripePriceId():", priceId)
        console.log("[checkout debug] line_items:", JSON.stringify(lineItems))
        console.log("[checkout debug] Stripe API version:", "2026-02-25.clover")

        try {
            const retrievedPrice = await stripe.prices.retrieve(priceId)
            console.log("[checkout debug] prices.retrieve OK:", {
                id: retrievedPrice.id,
                active: retrievedPrice.active,
                type: retrievedPrice.type,
                currency: retrievedPrice.currency,
            })
        } catch (priceErr: unknown) {
            console.error("[checkout debug] prices.retrieve FAILED:", priceErr)
            const stripeErr = priceErr as {
                message?: string
                type?: string
                code?: string
                statusCode?: number
                raw?: unknown
                rawType?: string
            }
            return NextResponse.json(
                {
                    error: "Stripe prices.retrieve failed",
                    message: stripeErr.message ?? (priceErr instanceof Error ? priceErr.message : String(priceErr)),
                    type: stripeErr.type ?? null,
                    code: stripeErr.code ?? null,
                    statusCode: stripeErr.statusCode ?? null,
                    rawType: stripeErr.rawType ?? null,
                    raw: stripeErr.raw ?? null,
                    debug: {
                        envStripePriceId: process.env.STRIPE_PRICE_ID ?? null,
                        getStripePriceId: priceId,
                        line_items: lineItems,
                        apiVersion: "2026-02-25.clover",
                    },
                },
                { status: 500 }
            )
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: email,
            metadata,
            line_items: lineItems,
            success_url,
            cancel_url,
        })

        console.log("SUCCESS URL:", success_url)
        console.log("STRIPE URL:", session.url)
        console.log("[checkout] new session (no reuse):", session.id)

        return NextResponse.json(
            { url: session.url },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    Pragma: "no-cache",
                },
            }
        )
    } catch (error) {
        console.error("Stripe full error:", error)

        const message = error instanceof Error ? error.message : "Error creando checkout"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
