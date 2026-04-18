import type { SupabaseClient } from "@supabase/supabase-js"

export type TradingStudentRow = {
    id?: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    profile_completed: boolean | null
    access_code?: string | null
    access_type?: string | null
    is_active?: boolean | null
    access_expires_at?: string | null
}

export async function ensureTradingStudentByEmail(
    admin: SupabaseClient,
    email: string
): Promise<TradingStudentRow> {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await admin
        .from("trading_students")
        .select("id, email, first_name, last_name, phone, profile_completed, access_type, is_active, access_expires_at")
        .eq("email", normalized)
        .limit(1)
        .maybeSingle()

    if (!error && data) return data as TradingStudentRow

    const { data: inserted, error: insertErr } = await admin
        .from("trading_students")
        .insert({
            email: normalized,
            profile_completed: false,
            access_type: "paid",
            is_active: true,
        })
        .select("id, email, first_name, last_name, phone, profile_completed, access_type, is_active, access_expires_at")
        .single()

    if (insertErr || !inserted) {
        throw new Error(`Failed to ensure student row: ${insertErr?.message ?? "unknown error"}`)
    }

    console.log("👤 student created", { email: normalized })
    return inserted as TradingStudentRow
}

export function isTradingStudentProfileCompleted(row: TradingStudentRow | null | undefined): boolean {
    return row?.profile_completed === true
}

/** Names + phone present (trimmed). Used for dashboard access and post-login redirect. */
export function isDashboardProfileComplete(row: TradingStudentRow | null | undefined): boolean {
    const fn = (row?.first_name ?? "").trim()
    const ln = (row?.last_name ?? "").trim()
    const ph = (row?.phone ?? "").trim()
    return Boolean(fn && ln && ph)
}

export function dashboardPostLoginRedirect(
    row: TradingStudentRow | null | undefined
): "/dashboard" | "/complete-profile" {
    return isDashboardProfileComplete(row) ? "/dashboard" : "/complete-profile"
}

