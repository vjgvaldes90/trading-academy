import { NextResponse } from "next/server"
import Stripe from "stripe"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
})

function appOrigin(): string {
    const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    return raw.replace(/\/$/, "")
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json(
                { error: "Email requerido" },
                { status: 400 }
            )
        }

        const DOMAIN = appOrigin()
        const success_url = `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`
        const cancel_url = `${DOMAIN}/login`

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],

            customer_email: email,

            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Smart Option Academy",
                            description: "Acceso completo a la academia de trading",
                        },
                        unit_amount: 15000,
                    },
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

        return NextResponse.json(
            { error: "Error creando checkout" },
            { status: 500 }
        )
    }
}
