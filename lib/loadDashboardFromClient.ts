import type { SupabaseClient } from "@supabase/supabase-js"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import type { DbSession } from "@/lib/sessions"

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
 * Same rules as `emailHasPaid` (lib/hasPaid), using the browser Supabase client.
 * Requires SELECT policies (or RLS off) on `tradingbookings` and `trading_students`.
 */
export async function clientEmailHasPaid(client: SupabaseClient, email: string): Promise<boolean> {
    const norm = email.trim().toLowerCase()
    if (!norm) return false

    const { data, error } = await client
        .from("tradingbookings")
        .select("paid")
        .eq("email", norm)
        .limit(20)

    if (error) {
        console.warn("[clientEmailHasPaid] tradingbookings", error.message)
    } else {
        const rows = (data ?? []) as { paid?: boolean | null }[]
        if (rows.some((r) => Boolean(r.paid))) return true
    }

    const { data: student, error: stErr } = await client
        .from("trading_students")
        .select("access_code")
        .eq("email", norm)
        .limit(1)
        .maybeSingle()

    if (stErr) {
        console.warn("[clientEmailHasPaid] trading_students", stErr.message)
        return false
    }

    return typeof student?.access_code === "string" && student.access_code.length > 0
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
    const canBook = await clientEmailHasPaid(client, email)

    const { data: sessionRows, error: sessionErr } = await client
        .from("trading_sessions")
        .select("*")
        .order("session_date", { ascending: true })
        .order("session_hour", { ascending: true })

    if (sessionErr) {
        console.error("[loadDashboardFromClient] sessions", sessionErr)
        return { sessions: [], myBookings: [], canBook }
    }

    const rows = Array.isArray(sessionRows) ? sessionRows : []
    const sessionIds = rows
        .map((r) => (typeof (r as { id?: unknown }).id === "string" ? (r as { id: string }).id : null))
        .filter((id): id is string => id != null)

    const bookingCounts = new Map<string, number>()
    let bookingRows: { session_id?: unknown }[] = []

    if (sessionIds.length > 0) {
        const { data: br, error: bookingErr } = await client
            .from("tradingbookings")
            .select("session_id")
            .in("session_id", sessionIds)
        if (bookingErr) {
            console.error("[loadDashboardFromClient] booking counts", bookingErr)
        } else {
            bookingRows = br ?? []
            for (const row of bookingRows) {
                const sid = typeof row.session_id === "string" ? row.session_id : null
                if (!sid) continue
                bookingCounts.set(sid, (bookingCounts.get(sid) ?? 0) + 1)
            }
        }
    }

    const bookedIds = new Set<string>()
    const { data: mineRows, error: mineErr } = await client
        .from("tradingbookings")
        .select("id, session_id, email")
        .eq("email", email)

    let myBookingRows: { id: string; session_id: string; email: string }[] = []

    if (mineErr) {
        console.error("[loadDashboardFromClient] my bookings", mineErr)
    } else {
        myBookingRows =
            (mineRows ?? [])
                .map((r) => {
                    const rec = r as { id?: unknown; session_id?: unknown; email?: unknown }
                    const id = typeof rec.id === "string" ? rec.id : null
                    const session_id = typeof rec.session_id === "string" ? rec.session_id : null
                    const bookingEmail = typeof rec.email === "string" ? rec.email : null
                    if (!id || !session_id || bookingEmail !== email) return null
                    bookedIds.add(session_id)
                    return { id, session_id, email: bookingEmail }
                })
                .filter((x): x is { id: string; session_id: string; email: string } => x != null) ?? []
    }

    let initialMyBookings: ClientMyBooking[] = []
    const mineIds = [...new Set(myBookingRows.map((b) => b.session_id))]
    if (mineIds.length > 0) {
        const { data: sessRows } = await client
            .from("trading_sessions")
            .select("id, session_day, session_hour, session_date")
            .in("id", mineIds)
        const sessionMap = new Map(
            (sessRows ?? []).map((row) => {
                const rec = row as {
                    id: string
                    session_day?: string | null
                    session_hour?: string | null
                    session_date?: string | null
                }
                return [rec.id, rec] as const
            })
        )
        initialMyBookings = myBookingRows.map((b) => {
            const rec = sessionMap.get(b.session_id)
            return {
                id: b.id,
                session_id: b.session_id,
                email: b.email,
                sessionDay: typeof rec?.session_day === "string" ? rec.session_day : null,
                sessionHour: typeof rec?.session_hour === "string" ? rec.session_hour : null,
                sessionDate: typeof rec?.session_date === "string" ? rec.session_date : null,
            }
        })
    }

    const sessions: DbSession[] = rows
        .map((row) => mapSupabaseSessionRow(row as Record<string, unknown>))
        .filter((s): s is DbSession => s != null)
        .map((s) => ({
            ...s,
            booked_slots: bookingCounts.get(s.id) ?? 0,
            isBookedByUser: bookedIds.has(s.id),
        }))

    return { sessions, myBookings: initialMyBookings, canBook }
}
