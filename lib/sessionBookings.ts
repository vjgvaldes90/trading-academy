import type { SupabaseClient } from "@supabase/supabase-js"
import type { BookingActor } from "@/lib/access"

/**
 * Tabla `tradingbookings` (service role): fila por reserva de sesión.
 * FK esperada: `session_id` -> `trading_sessions.id`.
 */
export async function fetchBookedSessionIdsForActor(
    admin: SupabaseClient,
    actor: BookingActor
): Promise<string[]> {
    const email = actor.email?.trim().toLowerCase() ?? null
    if (!email) return []

    const { data, error } = await admin
        .from("tradingbookings")
        .select("session_id")
        .eq("email", email)
    if (error) {
        console.warn("[fetchBookedSessionIdsForActor]", error.message)
        return []
    }

    const ids = new Set<string>()
    for (const row of data ?? []) {
        const sid = typeof (row as { session_id?: unknown }).session_id === "string"
            ? ((row as { session_id: string }).session_id)
            : null
        if (sid) ids.add(sid)
    }
    return [...ids]
}

export async function hasUserBookingForSession(
    admin: SupabaseClient,
    sessionId: string,
    actor: BookingActor
): Promise<boolean> {
    const email = actor.email?.trim().toLowerCase() ?? null
    if (!email) return false

    const { data, error } = await admin
        .from("tradingbookings")
        .select("id")
        .eq("session_id", sessionId)
        .eq("email", email)
        .limit(1)
        .maybeSingle()
    if (error && error.code !== "PGRST116") {
        console.warn("[hasUserBookingForSession]", error.message)
    }
    return Boolean(data)
}

export async function insertSessionBooking(
    admin: SupabaseClient,
    sessionId: string,
    actor: BookingActor
): Promise<{ ok: true } | { ok: false; message: string }> {
    const email = actor.email?.trim().toLowerCase() ?? null
    const row: Record<string, unknown> = { session_id: sessionId }
    if (email) row.email = email
    const { error } = await admin.from("tradingbookings").insert(row)
    if (error) {
        console.error("[insertSessionBooking]", error)
        return { ok: false, message: error.message.includes("duplicate") ? "Ya tenías esta reserva." : "No se pudo registrar la reserva." }
    }
    return { ok: true }
}
