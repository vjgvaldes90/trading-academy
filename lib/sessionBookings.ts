import type { SupabaseClient } from "@supabase/supabase-js"
import type { BookingActor } from "@/lib/access"

/**
 * `bookings` table (service role): one row per session reservation.
 * FK: `session_id` → `trading_sessions.id`.
 */
export async function fetchBookedSessionIdsForActor(
    admin: SupabaseClient,
    actor: BookingActor
): Promise<string[]> {
    const email = actor.email?.trim().toLowerCase() ?? null
    if (!email) return []

    const { data, error } = await admin
        .from("bookings")
        .select("session_id")
        .eq("user_email", email)
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
    if (!email) return false

    const { data, error } = await admin
        .from("bookings")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_email", email)
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
    if (!email) {
        return { ok: false, message: "Email requerido." }
    }
    const { error } = await admin.from("bookings").insert({ session_id: sessionId, user_email: email })
    if (error) {
        console.error("[insertSessionBooking]", error)
        return {
            ok: false,
            message: error.code === "23505" || /duplicate|unique/i.test(error.message ?? "")
                ? "Ya tenías esta reserva."
                : "No se pudo registrar la reserva.",
        }
    }
    return { ok: true }
}
