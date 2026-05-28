import { NextResponse } from "next/server"
import { createStripeClient, getStripePriceId, getStripeSecretKey } from "@/lib/stripe-server"

export const runtime = "nodejs"

// IMPORTANT:
// Do NOT reserve seats here.
// Booking must only happen from the dashboard.

function appOrigin(): string {
    const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000"
    return raw.replace(/\/$/, "")
}

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

        const DOMAIN = appOrigin()
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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: email,
            metadata,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
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
