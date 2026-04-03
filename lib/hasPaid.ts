import type { SupabaseClient } from "@supabase/supabase-js"

export function normalizeUserEmail(email: string | null | undefined): string | null {
    const e = email?.trim().toLowerCase()
    return e || null
}

/**
 * Acceso de pago: `tradingbookings.paid` o fila en `trading_students` con `access_code` (Stripe / código).
 * En la app el concepto unificado es **hasPaid**.
 */
export async function emailHasPaid(admin: SupabaseClient, email: string): Promise<boolean> {
    const norm = normalizeUserEmail(email)
    if (!norm) return false

    const { data, error } = await admin
        .from("tradingbookings")
        .select("paid")
        .eq("email", norm)
        .limit(20)

    if (error) {
        console.error("[hasPaid] error checking paid status", { email: norm, message: error.message })
        return false
    }

    const rows = (data ?? []) as { paid?: boolean | null }[]
    if (rows.some((r) => Boolean(r.paid))) return true

    const { data: student, error: stErr } = await admin
        .from("trading_students")
        .select("access_code")
        .eq("email", norm)
        .limit(1)
        .maybeSingle()

    if (stErr) {
        console.error("[hasPaid] trading_students check failed", { email: norm, message: stErr.message })
        return false
    }

    return typeof student?.access_code === "string" && student.access_code.length > 0
}
