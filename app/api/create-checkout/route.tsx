import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { createSubscriptionCheckoutSession } from "@/lib/createSubscriptionCheckout"
import { hasBlockingSubscription } from "@/lib/preEnrolledCheckoutGate"
import { getStripeSecretKey } from "@/lib/stripe-server"
import { parseCheckoutPlan, type SubscriptionPlanId } from "@/lib/subscriptionPlans"

export const runtime = "nodejs"

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

    const blocked = hasBlockingSubscription({
        subscription_id: subscriptionId,
        subscription_status: subscriptionStatus,
    })

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

        console.log("[checkout] plan=", plan)

        const created = await createSubscriptionCheckoutSession({
            email,
            plan,
            userId,
            sessionId,
        })

        if (!created.ok) {
            return NextResponse.json(
                {
                    error: created.error,
                    ...(created.code ? { code: created.code } : {}),
                    ...(created.plan ? { plan: created.plan } : {}),
                    ...(created.details ?? {}),
                },
                { status: created.status }
            )
        }

        return NextResponse.json(
            {
                url: created.url,
                plan: created.plan,
                debug: {
                    getAppUrl: created.appUrl,
                    getAppUrlSource: created.appUrlSource,
                    success_url: created.success_url,
                    cancel_url: created.cancel_url,
                    plan: created.plan,
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
