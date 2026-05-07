import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { canJoinLiveSessionNow, startAt, type DbSession } from "@/lib/sessions"

export const runtime = "nodejs"

export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const supabase = createSupabaseServiceRoleClient()

        const { data: sessions, error: sessionsErr } = await supabase
            .from("sessions")
            .select("*")
            .eq("status", "active")

        if (sessionsErr) {
            console.error("[api/admin/sessions] sessions query error", sessionsErr)
            return NextResponse.json(
                { error: "Failed to load admin sessions", details: sessionsErr.message },
                { status: 500 }
            )
        }

        const { data: bookings, error: bookingsErr } = await supabase
            .from("bookings")
            .select("session_id")
            .eq("status", "confirmed")

        if (bookingsErr) {
            console.error("[api/admin/sessions] bookings query error", bookingsErr)
            return NextResponse.json(
                { error: "Failed to load admin sessions", details: bookingsErr.message },
                { status: 500 }
            )
        }

        const bookedCountBySession = new Map<string, number>()
        for (const row of bookings ?? []) {
            const sessionId =
                typeof (row as { session_id?: unknown }).session_id === "string"
                    ? (row as { session_id: string }).session_id
                    : null
            if (!sessionId) continue
            bookedCountBySession.set(sessionId, (bookedCountBySession.get(sessionId) ?? 0) + 1)
        }

        const now = new Date()
        const payload = (sessions ?? []).map((row) => {
            const r = row as Record<string, unknown>
            const id = typeof r.id === "string" ? r.id : ""
            const date =
                typeof r.date === "string"
                    ? r.date
                    : typeof r.session_date === "string"
                      ? r.session_date
                      : null
            const time =
                typeof r.time === "string"
                    ? r.time
                    : typeof r.session_hour === "string"
                      ? r.session_hour
                      : null
            const dbSession: DbSession = {
                id,
                day: null,
                date,
                time,
                max_slots: 0,
                booked_slots: 0,
                link: null,
                is_live: r.is_live === true,
            }
            const nearStart = canJoinLiveSessionNow(dbSession, now)
            const startsAt = startAt(dbSession)
            const started = startsAt ? now.getTime() >= startsAt.getTime() : false
            return {
                id,
                title: typeof r.title === "string" ? r.title : null,
                date,
                time,
                capacity: typeof r.capacity === "number" ? r.capacity : 0,
                booked: bookedCountBySession.get(id) ?? 0,
                status: typeof r.status === "string" ? r.status : "active",
                is_live: started || r.is_live === true,
                starts_at: startsAt ? startsAt.toISOString() : null,
                starts_soon: nearStart,
            }
        })

        return NextResponse.json(payload)
    } catch (err: unknown) {
        console.error("[api/admin/sessions] GET", err)
        return NextResponse.json(
            { error: "Internal error", details: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        )
    }
}

