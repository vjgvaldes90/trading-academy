import type { SupabaseClient } from "@supabase/supabase-js"

export type TradingStudentRow = {
    id?: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    profile_completed: boolean | null
    access_code?: string | null
}

export async function ensureTradingStudentByEmail(
    admin: SupabaseClient,
    email: string
): Promise<TradingStudentRow> {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await admin
        .from("trading_students")
        .select("id, email, first_name, last_name, phone, profile_completed")
        .eq("email", normalized)
        .limit(1)
        .maybeSingle()

    if (!error && data) return data as TradingStudentRow

    const { data: inserted, error: insertErr } = await admin
        .from("trading_students")
        .insert({
            email: normalized,
            profile_completed: false,
        })
        .select("id, email, first_name, last_name, phone, profile_completed")
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

