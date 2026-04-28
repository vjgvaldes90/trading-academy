import type { DbSession } from "./sessions"

/**
 * Maps Supabase `sessions` row to `DbSession`.
 * Supports `session_date` / `session_day` / `session_hour` and legacy `date` / `day` / `time`.
 * Meet URL: `sessions.link`.
 */
export function mapSupabaseSessionRow(row: Record<string, unknown>): DbSession | null {
    const id = typeof row.id === "string" ? row.id : null
    if (!id) return null

    const session_date = row.session_date ?? row.date
    const session_day = row.session_day ?? row.day
    const session_hour = row.session_hour ?? row.time
    const meetingUrl = row.link
    const capacity = row.capacity ?? row.max_slots
    const capNum = typeof capacity === "number" ? capacity : 10
    const availableSpots =
        typeof row.available_spots === "number" ? row.available_spots : null
    const seatsTaken =
        typeof row.seats_taken === "number"
            ? row.seats_taken
            : typeof row.booked_slots === "number"
              ? row.booked_slots
              : typeof availableSpots === "number"
                ? Math.max(0, capNum - availableSpots)
              : null

    return {
        id,
        title: typeof row.title === "string" ? row.title : null,
        day: typeof session_day === "string" ? session_day : null,
        date: typeof session_date === "string" ? session_date : null,
        time: typeof session_hour === "string" ? session_hour : null,
        max_slots: capNum,
        booked_slots: seatsTaken,
        available_spots: availableSpots,
        link: typeof meetingUrl === "string" ? meetingUrl : null,
        is_live: row.is_live === true,
        is_booked: row.is_booked === true,
        isBookedByUser: false,
    }
}
