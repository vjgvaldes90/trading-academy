import { NextResponse } from "next/server"
import Stripe from "stripe"

export const runtime = "nodejs"

// IMPORTANT:
// Do NOT reserve seats here.
// Booking must only happen from dashboard.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
})

/** Stripe Dashboard recurring price (monthly subscription). */
const MONTHLY_SUBSCRIPTION_PRICE_ID = "price_1TNLRdCM6zKu8aLu2HxK3w2W"

function appOrigin(): string {
    const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    return raw.replace(/\/$/, "")
}

export async function POST(req: Request) {
    try {
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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: email,
            metadata,
            line_items: [
                {
                    price: MONTHLY_SUBSCRIPTION_PRICE_ID,
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
        console.error("❌ Stripe error:", error)

        return NextResponse.json({ error: "Error creando checkout" }, { status: 500 })
    }
}
