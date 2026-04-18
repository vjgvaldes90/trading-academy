import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"
import { emailHasAcademyAccess } from "@/lib/hasPaid"

export type BookingActor = {
    email: string | null
}

export type CanBookResult = { ok: true } | { ok: false; reason: string }

/**
 * Business rules (server-side):
 * Access via `trading_students` (is_active, access_type, optional expiry; paid needs access_code).
 *
 * Extend `subscriptions` when you sync Stripe customer_subscription webhooks.
 */
export async function canUserBook(
    admin: SupabaseClient,
    _ignoredActorEmailKey: string | null,
    email: string | null
): Promise<CanBookResult> {
    const normalizedEmail = email?.trim().toLowerCase() || null

    if (!normalizedEmail) {
        return { ok: false, reason: "Debes iniciar sesión para reservar." }
    }

    if (normalizedEmail) {
        try {
            const allowed = await emailHasAcademyAccess(admin, normalizedEmail)
            if (allowed) return { ok: true }
        } catch (e) {
            console.error("[canUserBook] access check failed", e)
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
