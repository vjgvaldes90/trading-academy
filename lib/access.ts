import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"
import { emailHasPaid } from "@/lib/hasPaid"

export type BookingActor = {
    userId: string | null
    email: string | null
}

export type CanBookResult = { ok: true } | { ok: false; reason: string }

/**
 * Business rules (server-side):
 * 1. Optional: active Stripe-backed row in `subscriptions` (user_id + stripe_status = 'active')
 * 2. Paid product access in `tradingbookings` (email + paid = true)
 *
 * Extend `subscriptions` when you sync Stripe customer_subscription webhooks.
 */
export async function canUserBook(
    admin: SupabaseClient,
    userId: string | null,
    email: string | null
): Promise<CanBookResult> {
    const normalizedEmail = email?.trim().toLowerCase() || null

    if (!userId && !normalizedEmail) {
        return { ok: false, reason: "Debes iniciar sesión para reservar." }
    }

    if (userId) {
        const { data: sub, error: subErr } = await admin
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .eq("stripe_status", "active")
            .limit(1)
            .maybeSingle()

        const missingTable =
            subErr &&
            (subErr.code === "PGRST205" ||
                (typeof subErr.message === "string" && subErr.message.includes("Could not find the table")))

        if (!subErr && sub) {
            return { ok: true }
        }
        if (subErr && !missingTable) {
            console.warn("[canUserBook] subscriptions check failed", subErr)
        }
    }

    if (normalizedEmail) {
        try {
            const paid = await emailHasPaid(admin, normalizedEmail)
            if (paid) return { ok: true }
        } catch (e) {
            console.error("[canUserBook] tradingbookings check failed", e)
            return { ok: false, reason: "No pudimos verificar tu acceso. Intenta más tarde." }
        }
    }

    return {
        ok: false,
        reason: "No tienes acceso activo. Compra acceso para reservar cupos.",
    }
}

export function createSupabaseServiceRoleClient(): SupabaseClient {
    const url =
        process.env.SUPABASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!url || !key) {
        throw new Error(
            "Missing Supabase server config: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL as URL fallback)"
        )
    }
    return createClient(url, key)
}
