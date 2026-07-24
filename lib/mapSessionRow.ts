import type { DbSession } from "./sessions"

/**
 * Maps Supabase `sessions` row to `DbSession`.
 * Supports `session_date` / `session_day` / `session_hour` and legacy `date` / `day` / `time`.
 * Student join URL: `sessions.link` (Zoom `join_url`).
 */
export function mapSupabaseSessionRow(row: Record<string, unknown>): DbSession | null {
    const id = typeof row.id === "string" ? row.id : null
    if (!id) return null

    const session_date = row.session_date ?? row.date
    const session_day = row.session_day ?? row.day
    const session_hour = row.session_hour ?? row.time
    const meetingUrl = row.link

    return {
        id,
        title: typeof row.title === "string" ? row.title : null,
        day: typeof session_day === "string" ? session_day : null,
        date: typeof session_date === "string" ? session_date : null,
        time: typeof session_hour === "string" ? session_hour : null,
        link: typeof meetingUrl === "string" ? meetingUrl : null,
        is_live: row.is_live === true,
    }
}
