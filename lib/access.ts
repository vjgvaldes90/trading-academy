import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"
import { emailHasAcademyAccess } from "@/lib/hasPaid"
import { getTranslations } from "@/lib/i18n"

export type AcademyActor = {
    email: string | null
}

export type AcademyAccessCheckResult = { ok: true } | { ok: false; reason: string }

/**
 * Business rules (server-side):
 * Access via `trading_students` (is_active, access_type, optional expiry; paid needs access_code).
 */
export async function canAccessAcademy(
    admin: SupabaseClient,
    _ignored: string | null,
    email: string | null
): Promise<AcademyAccessCheckResult> {
    const normalizedEmail = email?.trim().toLowerCase() || null
    const tr = getTranslations("es")

    if (!normalizedEmail) {
        return { ok: false, reason: tr.mustSignInToContinue }
    }

    try {
        const allowed = await emailHasAcademyAccess(admin, normalizedEmail)
        if (allowed) return { ok: true }
    } catch (e) {
        console.error("[canAccessAcademy] access check failed", e)
        return { ok: false, reason: tr.accessVerifyFailedRetry }
    }

    return {
        ok: false,
        reason: tr.accessDeniedPurchaseRequired,
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
