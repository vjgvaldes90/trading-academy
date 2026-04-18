import type { SupabaseClient } from "@supabase/supabase-js"
import {
    evaluateAcademyAccess,
    type AcademyAccessEvaluation,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export function normalizeUserEmail(email: string | null | undefined): string | null {
    const e = email?.trim().toLowerCase()
    return e || null
}

/**
 * Academy access: active student, optional expiry, paid path requires access_code;
 * free / discounted / VIP rely on is_active + expiry only.
 */
export async function emailHasAcademyAccess(admin: SupabaseClient, email: string): Promise<boolean> {
    const norm = normalizeUserEmail(email)
    if (!norm) return false

    const { data: student, error: stErr } = await admin
        .from("trading_students")
        .select("access_code, access_type, is_active, access_expires_at")
        .eq("email", norm)
        .limit(1)
        .maybeSingle()

    if (stErr) {
        console.error("[emailHasAcademyAccess] trading_students check failed", {
            email: norm,
            message: stErr.message,
        })
        return false
    }

    return evaluateAcademyAccess(student as TradingStudentAccessRow | null).ok
}

/** Same row shape as `emailHasAcademyAccess`, but returns the evaluation (e.g. `reason: "expired"`). */
export async function emailAcademyAccessEvaluation(
    admin: SupabaseClient,
    email: string
): Promise<AcademyAccessEvaluation> {
    const norm = normalizeUserEmail(email)
    if (!norm) {
        return { ok: false, reason: "not_found" }
    }

    const { data: student, error: stErr } = await admin
        .from("trading_students")
        .select("access_code, access_type, is_active, access_expires_at")
        .eq("email", norm)
        .limit(1)
        .maybeSingle()

    if (stErr) {
        console.error("[emailAcademyAccessEvaluation] trading_students check failed", {
            email: norm,
            message: stErr.message,
        })
        return { ok: false, reason: "not_found" }
    }

    return evaluateAcademyAccess(student as TradingStudentAccessRow | null)
}

/** @deprecated Use emailHasAcademyAccess; kept as alias for existing imports. */
export async function emailHasPaid(admin: SupabaseClient, email: string): Promise<boolean> {
    return emailHasAcademyAccess(admin, email)
}
