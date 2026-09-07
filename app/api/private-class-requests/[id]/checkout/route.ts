import { NextResponse } from "next/server"
import { resolveAppUrl } from "@/lib/app-url"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { emailAcademyAccessEvaluation } from "@/lib/hasPaid"
import {
    PRIVATE_CLASS_PRODUCT_TYPE,
    PRIVATE_CLASS_REQUEST_SELECT,
    privateClassRequestIdSchema,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    createStripeClient,
    getStripePriceIdPrivateClass,
    getStripeSecretKey,
} from "@/lib/stripe-server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

function paymentIntentIdFromSession(session: {
    payment_intent?: string | { id?: string } | null
}): string | null {
    const pi = session.payment_intent
    if (typeof pi === "string" && pi.trim()) return pi.trim()
    if (pi && typeof pi === "object" && typeof pi.id === "string" && pi.id.trim()) {
        return pi.id.trim()
    }
    return null
}

export async function POST(_req: Request, context: RouteContext) {
    try {
        if (!getStripeSecretKey()) {
            return NextResponse.json(
                { error: "Stripe is not configured", code: "stripe_not_configured" },
                { status: 503 }
            )
        }

        const priceId = getStripePriceIdPrivateClass()
        if (!priceId) {
            return NextResponse.json(
                {
                    error: "STRIPE_PRICE_ID_PRIVATE_CLASS is not configured",
                    code: "missing_private_class_price",
                },
                { status: 503 }
            )
        }

        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

        const { id: rawId } = await context.params
        const idParsed = privateClassRequestIdSchema.safeParse(rawId)
        if (!idParsed.success) {
            return NextResponse.json({ error: "Invalid request id", code: "validation_error" }, { status: 400 })
        }
        const requestId = idParsed.data

        const supabase = createSupabaseServiceRoleClient()
        const access = await emailAcademyAccessEvaluation(supabase, email)
        if (!access.ok) {
            return NextResponse.json(
                {
                    error: "Academy access required",
                    code: "academy_access_denied",
                    reason: access.reason,
                },
                { status: 403 }
            )
        }

        const { data: student, error: studentErr } = await supabase
            .from("trading_students")
            .select("id")
            .eq("email", email)
            .maybeSingle()

        if (studentErr || !student?.id) {
            return NextResponse.json({ error: "Student not found", code: "not_found" }, { status: 404 })
        }

        const { data: row, error: loadErr } = await supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        if (loadErr) {
            console.error("[private-class checkout] load", loadErr.message)
            return NextResponse.json({ error: "Failed to load request" }, { status: 500 })
        }
        if (!row) {
            return NextResponse.json({ error: "Request not found", code: "not_found" }, { status: 404 })
        }

        const request = row as PrivateClassRequestRow
        if (request.student_id !== student.id) {
            return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 })
        }

        if (request.status !== "awaiting_payment") {
            return NextResponse.json(
                {
                    error: "Checkout is only available for approved requests awaiting payment",
                    code: "invalid_status",
                    status: request.status,
                },
                { status: 409 }
            )
        }

        const stripe = createStripeClient()
        const existingSessionId =
            typeof request.stripe_checkout_session_id === "string" &&
            request.stripe_checkout_session_id.trim()
                ? request.stripe_checkout_session_id.trim()
                : null

        if (existingSessionId) {
            try {
                const existing = await stripe.checkout.sessions.retrieve(existingSessionId)
                if (existing.status === "open" && existing.url) {
                    console.log("[private-class checkout] reusing open session", {
                        requestId,
                        sessionId: existing.id,
                    })
                    return NextResponse.json({
                        url: existing.url,
                        reused: true,
                        checkout_session_id: existing.id,
                    })
                }
            } catch (retrieveErr) {
                console.warn("[private-class checkout] existing session retrieve failed — creating new", {
                    requestId,
                    existingSessionId,
                    error: retrieveErr instanceof Error ? retrieveErr.message : String(retrieveErr),
                })
            }
        }

        try {
            const retrievedPrice = await stripe.prices.retrieve(priceId)
            if (retrievedPrice.type !== "one_time") {
                return NextResponse.json(
                    {
                        error: "STRIPE_PRICE_ID_PRIVATE_CLASS must be a one-time Price",
                        code: "invalid_private_class_price_type",
                    },
                    { status: 500 }
                )
            }
            if (retrievedPrice.active === false) {
                return NextResponse.json(
                    {
                        error: "Private class Stripe Price is inactive",
                        code: "inactive_private_class_price",
                    },
                    { status: 503 }
                )
            }
        } catch (priceErr) {
            console.error("[private-class checkout] prices.retrieve failed", priceErr)
            return NextResponse.json(
                {
                    error: "Failed to validate private class Stripe Price",
                    code: "private_class_price_retrieve_failed",
                },
                { status: 500 }
            )
        }

        const domain = resolveAppUrl().url
        const success_url = `${domain}/dashboard?private_class=success&request_id=${encodeURIComponent(requestId)}`
        const cancel_url = `${domain}/dashboard?private_class=cancel&request_id=${encodeURIComponent(requestId)}`

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            metadata: {
                product_type: PRIVATE_CLASS_PRODUCT_TYPE,
                private_class_request_id: requestId,
                email,
            },
            payment_intent_data: {
                metadata: {
                    product_type: PRIVATE_CLASS_PRODUCT_TYPE,
                    private_class_request_id: requestId,
                    email,
                },
            },
            success_url,
            cancel_url,
        })

        if (!session.url) {
            return NextResponse.json(
                { error: "Stripe did not return a checkout URL", code: "missing_checkout_url" },
                { status: 500 }
            )
        }

        const piId = paymentIntentIdFromSession(session)
        const { error: persistErr } = await supabase
            .from("private_class_requests")
            .update({
                stripe_checkout_session_id: session.id,
                ...(piId ? { stripe_payment_intent_id: piId } : {}),
            })
            .eq("id", requestId)
            .eq("status", "awaiting_payment")

        if (persistErr) {
            console.error("[private-class checkout] failed to store session id", persistErr.message)
            return NextResponse.json(
                { error: "Failed to persist checkout session", code: "persist_failed" },
                { status: 500 }
            )
        }

        console.log("[private-class checkout] session created", {
            requestId,
            sessionId: session.id,
        })

        return NextResponse.json({
            url: session.url,
            reused: false,
            checkout_session_id: session.id,
        })
    } catch (e) {
        console.error("[private-class checkout] POST", e)
        const message = e instanceof Error ? e.message : "Unable to create checkout"
        return NextResponse.json({ error: message, code: "checkout_failed" }, { status: 500 })
    }
}
