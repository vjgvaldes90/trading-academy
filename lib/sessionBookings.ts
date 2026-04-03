import type { SupabaseClient } from "@supabase/supabase-js"
import type { BookingActor } from "@/lib/access"

/**
 * Tabla `bookings` (público, acceso vía service role) — ejemplo mínimo:
 *   session_id (uuid), user_id (uuid, nullable), email (text, nullable)
 *   UNIQUE(session_id, user_id) y/o UNIQUE(session_id, email) según tu modelo.
 */
export async function fetchBookedSessionIdsForActor(
    admin: SupabaseClient,
    actor: BookingActor
): Promise<string[]> {
    const email = actor.email?.trim().toLowerCase() ?? null
    if (!actor.userId && !email) return []

    let q = admin.from("bookings").select("session_id")
    if (actor.userId && email) {
        q = q.or(`user_id.eq.${actor.userId},email.eq.${email}`)
    } else if (actor.userId) {
        q = q.eq("user_id", actor.userId)
    } else {
        q = q.eq("email", email!)
    }

    const { data, error } = await q
    if (error) {
        console.warn("[fetchBookedSessionIdsForActor]", error.message)
        return []
    }

    const ids = new Set<string>()
    for (const row of data ?? []) {
        const sid = typeof (row as { session_id?: unknown }).session_id === "string"
            ? (row as { session_id: string }).session_id
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
    if (!actor.userId && !email) return false

    let q = admin.from("bookings").select("id").eq("session_id", sessionId).limit(1)
    if (actor.userId && email) {
        q = q.or(`user_id.eq.${actor.userId},email.eq.${email}`)
    } else if (actor.userId) {
        q = q.eq("user_id", actor.userId)
    } else {
        q = q.eq("email", email!)
    }

    const { data, error } = await q.maybeSingle()
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
    if (actor.userId) row.user_id = actor.userId
    if (email) row.email = email
    const { error } = await admin.from("bookings").insert(row)
    if (error) {
        console.error("[insertSessionBooking]", error)
        return { ok: false, message: error.message.includes("duplicate") ? "Ya tenías esta reserva." : "No se pudo registrar la reserva." }
    }
    return { ok: true }
}
