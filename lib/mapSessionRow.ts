import type { DbSession } from "./sessions"

/**
 * Maps Supabase `sessions` row to `DbSession`.
 * Supports `session_date` / `session_day` / `session_hour` and legacy `date` / `day` / `time`.
 */
export function mapSupabaseSessionRow(row: Record<string, unknown>): DbSession | null {
    const id = typeof row.id === "string" ? row.id : null
    if (!id) return null

    const session_date = row.session_date ?? row.date
    const session_day = row.session_day ?? row.day
    const session_hour = row.session_hour ?? row.time
    const capacity = row.capacity ?? row.max_slots

    return {
        id,
        day: typeof session_day === "string" ? session_day : null,
        date: typeof session_date === "string" ? session_date : null,
        time: typeof session_hour === "string" ? session_hour : null,
        max_slots: typeof capacity === "number" ? capacity : 10,
        booked_slots: typeof row.booked_slots === "number" ? row.booked_slots : null,
        link: typeof row.link === "string" ? row.link : null,
        is_booked: row.is_booked === true,
        isBookedByUser: false,
    }
}
