import type { SupabaseClient } from "@supabase/supabase-js"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import type { DbSession } from "@/lib/sessions"

/** Uses `/api/student/access` (service-backed) so access rules do not depend on anon RLS. */
async function fetchClientAcademyAccessOk(email: string): Promise<boolean> {
    const norm = email.trim().toLowerCase()
    if (!norm) return false
    try {
        const res = await fetch(`/api/student/access?user_email=${encodeURIComponent(norm)}`, {
            cache: "no-store",
            credentials: "include",
        })
        if (!res.ok) return false
        const data = (await res.json().catch(() => ({}))) as { ok?: unknown }
        return data.ok === true
    } catch {
        return false
    }
}

/** Matches `MyBooking` in SessionContext (avoid circular imports). */
export type ClientMyBooking = {
    id: string
    session_id: string
    email: string
    sessionDay: string | null
    sessionHour: string | null
    sessionDate: string | null
}

/**
 * Academy access check for the logged-in dashboard email (uses `/api/student/access`).
 * @param _client unused; kept for call-site compatibility with `loadDashboardFromClient(supabase, email)`.
 */
export async function clientEmailHasPaid(_client: SupabaseClient, email: string): Promise<boolean> {
    return fetchClientAcademyAccessOk(email)
}

export type LoadDashboardResult = {
    sessions: DbSession[]
    myBookings: ClientMyBooking[]
    canBook: boolean
}

export async function loadDashboardFromClient(
    client: SupabaseClient,
    userEmail: string
): Promise<LoadDashboardResult> {
    const email = userEmail.trim().toLowerCase()
    if (!email) {
        throw new Error("Missing user_email")
    }
    const canBook = await fetchClientAcademyAccessOk(email)

    const sessionsRes = await fetch("/api/sessions", {
        cache: "no-store",
        credentials: "include",
    })
    if (!sessionsRes.ok) {
        const errBody = await sessionsRes.json().catch(() => ({}))
        console.error("[loadDashboardFromClient] /api/sessions", sessionsRes.status, errBody)
        return { sessions: [], myBookings: [], canBook }
    }

    const sessionRows = await sessionsRes.json()
    const rows = Array.isArray(sessionRows) ? sessionRows : []

    const bookingsRes = await fetch(
        `/api/my-bookings?user_email=${encodeURIComponent(email)}`,
        {
            cache: "no-store",
            credentials: "include",
        }
    )
    if (!bookingsRes.ok) {
        const errBody = await bookingsRes.json().catch(() => ({}))
        console.error("[loadDashboardFromClient] /api/my-bookings", bookingsRes.status, errBody)
        const sessionsNoBookings: DbSession[] = rows
            .map((row) => mapSupabaseSessionRow(row as Record<string, unknown>))
            .filter((s): s is DbSession => s != null)
            .map((s) => ({
                ...s,
                booked_slots: s.booked_slots ?? 0,
                isBookedByUser: false,
            }))
        return { sessions: sessionsNoBookings, myBookings: [], canBook }
    }

    const bookingsPayload = (await bookingsRes.json()) as unknown
    const bookingList = Array.isArray(bookingsPayload) ? bookingsPayload : []

    type SessionRec = {
        session_day: string | null
        session_hour: string | null
        session_date: string | null
    }

    const sessionMap = new Map<string, SessionRec>(
        rows.map((row) => {
            const rec = row as Record<string, unknown>
            const id = typeof rec.id === "string" ? rec.id : ""
            const session_date =
                (typeof rec.session_date === "string" ? rec.session_date : null) ??
                (typeof rec.date === "string" ? rec.date : null)
            const session_hour =
                (typeof rec.session_hour === "string" ? rec.session_hour : null) ??
                (typeof rec.time === "string" ? rec.time : null)
            const session_day =
                (typeof rec.session_day === "string" ? rec.session_day : null) ??
                (typeof rec.day === "string" ? rec.day : null)
            return [id, { session_date, session_hour, session_day }] as const
        })
    )

    const bookedIds = new Set<string>()
    const initialMyBookings: ClientMyBooking[] = []

    for (const raw of bookingList) {
        const r = raw as Record<string, unknown>
        const id = typeof r.id === "string" ? r.id : null
        const session_id = typeof r.session_id === "string" ? r.session_id : null
        const user_email_row =
            typeof r.user_email === "string" ? r.user_email.trim().toLowerCase() : null
        if (!id || !session_id) continue

        bookedIds.add(session_id)

        const join = r.sessions as Record<string, unknown> | null | undefined
        const joinDate =
            join && typeof join.session_date === "string"
                ? join.session_date
                : join && typeof join.date === "string"
                  ? join.date
                  : null
        const joinTime =
            join && typeof join.session_hour === "string"
                ? join.session_hour
                : join && typeof join.time === "string"
                  ? join.time
                  : null
        const joinDay =
            join && typeof join.session_day === "string"
                ? join.session_day
                : join && typeof join.day === "string"
                  ? join.day
                  : null

        const rec = sessionMap.get(session_id)
        initialMyBookings.push({
            id,
            session_id,
            email: user_email_row ?? email,
            sessionDay: joinDay ?? rec?.session_day ?? null,
            sessionHour: joinTime ?? rec?.session_hour ?? null,
            sessionDate: joinDate ?? rec?.session_date ?? null,
        })
    }

    const sessions: DbSession[] = rows
        .map((row) => mapSupabaseSessionRow(row as Record<string, unknown>))
        .filter((s): s is DbSession => s != null)
        .map((s) => ({
            ...s,
            booked_slots: s.booked_slots ?? 0,
            isBookedByUser: bookedIds.has(s.id),
        }))

    return { sessions, myBookings: initialMyBookings, canBook }
}
