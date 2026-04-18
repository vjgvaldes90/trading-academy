import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Fan-out one in-app notification per distinct confirmed booking email for a session.
 * Failures are logged only; caller should not roll back the session change.
 */
export async function notifyConfirmedBookingsOfSessionChange(
    supabase: SupabaseClient,
    sessionId: string,
    message: string
): Promise<void> {
    const { data: bookings, error } = await supabase
        .from("bookings")
        .select("user_email")
        .eq("session_id", sessionId)
        .eq("status", "confirmed")

    if (error) {
        console.error("[notifySessionBookingStudents] bookings fetch", error)
        return
    }

    const emails = new Set<string>()
    for (const row of bookings ?? []) {
        const raw = (row as { user_email?: unknown }).user_email
        const e = typeof raw === "string" ? raw.trim().toLowerCase() : ""
        if (e) emails.add(e)
    }

    if (emails.size === 0) return

    const rows = [...emails].map((user_email) => ({
        user_email,
        message,
        read: false,
    }))

    const { error: insErr } = await supabase.from("notifications").insert(rows)
    if (insErr) {
        console.error("[notifySessionBookingStudents] notifications insert", insErr)
    }
}
