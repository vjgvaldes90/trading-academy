/**
 * Private Class Stripe payment helpers (mode=payment, one-time $250).
 * Isolated from subscription fulfillPaidAccess / Full Program schedule.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { PRIVATE_CLASS_PRODUCT_TYPE } from "@/lib/privateClassRequests"

export function isPrivateClassCheckoutSession(session: Stripe.Checkout.Session): boolean {
    return session.metadata?.product_type === PRIVATE_CLASS_PRODUCT_TYPE
}

export function resolvePrivateClassRequestIdFromSession(
    session: Stripe.Checkout.Session
): string | null {
    const raw = session.metadata?.private_class_request_id
    if (typeof raw !== "string") return null
    const id = raw.trim()
    return id.length > 0 ? id : null
}

function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
    const pi = session.payment_intent
    if (typeof pi === "string" && pi.trim()) return pi.trim()
    if (pi && typeof pi === "object" && "id" in pi && typeof pi.id === "string") {
        return pi.id
    }
    return null
}

/**
 * Mark awaiting_payment → paid after verified Stripe Checkout payment.
 * Idempotent if already paid. Never touches trading_students / subscriptions.
 */
export async function fulfillPrivateClassPayment(args: {
    supabase: SupabaseClient
    requestId: string
    checkoutSession: Stripe.Checkout.Session
}): Promise<{ ok: true; alreadyPaid: boolean } | { ok: false; reason: string }> {
    const { supabase, requestId, checkoutSession } = args

    const { data: existing, error: loadErr } = await supabase
        .from("private_class_requests")
        .select("id, status, stripe_checkout_session_id")
        .eq("id", requestId)
        .maybeSingle()

    if (loadErr) {
        console.error("[private-class-stripe] load failed", loadErr.message)
        return { ok: false, reason: "db_load_failed" }
    }
    if (!existing) {
        return { ok: false, reason: "request_not_found" }
    }

    const status = String(existing.status ?? "")
    if (status === "paid" || status === "confirmed" || status === "completed") {
        console.log("[private-class-stripe] already paid/terminal — noop", {
            requestId,
            status,
            sessionId: checkoutSession.id,
        })
        return { ok: true, alreadyPaid: true }
    }

    if (status !== "awaiting_payment") {
        console.warn("[private-class-stripe] invalid status for payment", {
            requestId,
            status,
            sessionId: checkoutSession.id,
        })
        return { ok: false, reason: `invalid_status:${status}` }
    }

    const paymentIntentId = paymentIntentIdFromSession(checkoutSession)
    const paidAt = new Date().toISOString()

    const { data: updated, error: updateErr } = await supabase
        .from("private_class_requests")
        .update({
            status: "paid",
            stripe_payment_status: "paid",
            paid_at: paidAt,
            stripe_checkout_session_id: checkoutSession.id,
            ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
        })
        .eq("id", requestId)
        .eq("status", "awaiting_payment")
        .select("id")
        .maybeSingle()

    if (updateErr) {
        console.error("[private-class-stripe] update failed", updateErr.message)
        return { ok: false, reason: "db_update_failed" }
    }

    if (!updated) {
        // Race: another webhook may have won — treat as success if now paid.
        const { data: again } = await supabase
            .from("private_class_requests")
            .select("status")
            .eq("id", requestId)
            .maybeSingle()
        if (again && String(again.status) === "paid") {
            return { ok: true, alreadyPaid: true }
        }
        return { ok: false, reason: "transition_conflict" }
    }

    console.log("[private-class-stripe] marked paid", {
        requestId,
        sessionId: checkoutSession.id,
        paymentIntentId,
    })
    return { ok: true, alreadyPaid: false }
}

/**
 * Process a Checkout Session event for Private Class only.
 * Caller must already know product_type === private_class.
 */
export async function handlePrivateClassCheckoutPaidEvent(args: {
    supabase: SupabaseClient
    session: Stripe.Checkout.Session
    source: "checkout.session.completed" | "checkout.session.async_payment_succeeded"
}): Promise<void> {
    const { supabase, session, source } = args

    if (session.mode !== "payment") {
        console.warn("[private-class-stripe] ignoring non-payment mode", {
            source,
            sessionId: session.id,
            mode: session.mode,
        })
        return
    }

    if (session.payment_status !== "paid") {
        console.log("[private-class-stripe] payment not paid yet — skip", {
            source,
            sessionId: session.id,
            payment_status: session.payment_status,
        })
        return
    }

    const requestId = resolvePrivateClassRequestIdFromSession(session)
    if (!requestId) {
        throw new Error("Private class checkout missing metadata.private_class_request_id")
    }

    const result = await fulfillPrivateClassPayment({
        supabase,
        requestId,
        checkoutSession: session,
    })

    if (!result.ok) {
        if (result.reason.startsWith("invalid_status:")) {
            // Do not retry forever for rejected/cancelled — acknowledge event.
            console.warn("[private-class-stripe] not marking paid", result.reason)
            return
        }
        throw new Error(`Private class payment fulfill failed: ${result.reason}`)
    }
}
