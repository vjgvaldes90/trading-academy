import { NextResponse } from "next/server"
import { resolveAppUrl } from "@/lib/app-url"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { createStripeClient, getStripeSecretKey } from "@/lib/stripe-server"
import {
    getStripePriceIdForPlan,
    parseCheckoutPlan,
    type SubscriptionPlanId,
} from "@/lib/subscriptionPlans"
import { SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END } from "@/lib/subscriptionCancellation"

export const runtime = "nodejs"

const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
    "active",
    SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
])

async function studentHasBlockingSubscription(email: string): Promise<{
    blocked: boolean
    subscriptionId: string | null
    subscriptionStatus: string | null
}> {
    const supabase = createSupabaseServiceRoleClient()
    const { data, error } = await supabase
        .from("trading_students")
        .select("subscription_id, subscription_status")
        .eq("email", email)
        .maybeSingle()

    if (error) {
        console.error("[checkout] trading_students lookup for subscription guard failed", error)
        throw new Error("Failed to verify existing subscription")
    }

    const subscriptionId =
        typeof data?.subscription_id === "string" && data.subscription_id.trim()
            ? data.subscription_id.trim()
            : null
    const subscriptionStatus =
        typeof data?.subscription_status === "string" && data.subscription_status.trim()
            ? data.subscription_status.trim()
            : null

    const blocked =
        Boolean(subscriptionId) &&
        Boolean(subscriptionStatus) &&
        BLOCKING_SUBSCRIPTION_STATUSES.has(subscriptionStatus!)

    return { blocked, subscriptionId, subscriptionStatus }
}

export async function POST(req: Request) {
    console.log("Stripe key exists:", !!getStripeSecretKey())

    try {
        const body = (await req.json().catch(() => null)) as {
            email?: unknown
            userId?: unknown
            sessionId?: unknown
            plan?: unknown
            price_id?: unknown
            stripe_price_id?: unknown
            priceId?: unknown
            amount?: unknown
            price?: unknown
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

        const planParsed = parseCheckoutPlan(body?.plan)
        if (!planParsed.ok) {
            return NextResponse.json({ error: planParsed.error }, { status: 400 })
        }
        const plan: SubscriptionPlanId = planParsed.plan

        const priceResolved = getStripePriceIdForPlan(plan)
        if (!priceResolved.ok) {
            const status = priceResolved.code === "missing_full_program_price" ? 503 : 500
            return NextResponse.json(
                {
                    error: priceResolved.error,
                    code: priceResolved.code,
                    plan: priceResolved.plan,
                },
                { status }
            )
        }
        const priceId = priceResolved.priceId

        const emailForDb = email.toLowerCase()
        try {
            const existing = await studentHasBlockingSubscription(emailForDb)
            if (existing.blocked) {
                return NextResponse.json(
                    {
                        error: "Ya tienes una suscripción activa. No es posible crear otra suscripción.",
                        code: "subscription_already_active",
                        subscription_id: existing.subscriptionId,
                        subscription_status: existing.subscriptionStatus,
                    },
                    { status: 409 }
                )
            }
        } catch (guardErr) {
            console.error("[checkout] subscription guard error", guardErr)
            return NextResponse.json(
                { error: "No se pudo verificar la suscripción existente" },
                { status: 500 }
            )
        }

        const resolved = resolveAppUrl()
        const DOMAIN = resolved.url
        const success_url = `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`
        const cancel_url = `${DOMAIN}/`

        console.log("[checkout] plan=", plan)
        console.log("[checkout] priceId (server-selected)=", priceId)

        const metadata: Record<string, string> = {
            email: emailForDb,
            plan,
        }
        if (userId) metadata.user_id = userId
        if (sessionId) metadata.trading_session_id = sessionId

        const stripe = createStripeClient()
        const lineItems = [{ price: priceId, quantity: 1 }]

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
                { status: 500 }
            )
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: email,
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

        console.log("[checkout] Stripe session created", {
            id: session.id,
            plan,
            stripe_checkout_url: session.url,
        })

        return NextResponse.json(
            {
                url: session.url,
                plan,
                debug: {
                    getAppUrl: DOMAIN,
                    getAppUrlSource: resolved.source,
                    success_url,
                    cancel_url,
                    plan,
                },
            },
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
