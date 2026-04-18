import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("sessions")
            .select("id, date, time, capacity")
            .eq("status", "active")
            .order("date", { ascending: true })

        if (error) {
            console.error("Supabase error:", error)
            return NextResponse.json(
                { error: "Database error", details: error.message },
                { status: 500 }
            )
        }

        const sessions = Array.isArray(data) ? data : []
        const nowIso = new Date().toISOString()

        const withAvailability = await Promise.all(
            sessions.map(async (session) => {
                const { count: bookingsCount, error: bookingsErr } = await supabase
                    .from("bookings")
                    .select("id", { count: "exact", head: true })
                    .eq("session_id", session.id)
                    .eq("status", "confirmed")
                if (bookingsErr) {
                    throw new Error(bookingsErr.message)
                }

                const { count: reservationsCount, error: reservationsErr } = await supabase
                    .from("reservations")
                    .select("id", { count: "exact", head: true })
                    .eq("session_id", session.id)
                    .gt("expires_at", nowIso)
                if (reservationsErr) {
                    throw new Error(reservationsErr.message)
                }

                const capacity = typeof session.capacity === "number" ? session.capacity : 0
                const available_spots =
                    capacity - (bookingsCount ?? 0) - (reservationsCount ?? 0)

                return {
                    id: session.id,
                    date: session.date,
                    time: session.time,
                    capacity,
                    available_spots,
                }
            })
        )

        return NextResponse.json(withAvailability)
    } catch (err: any) {
        console.error("Server error:", err)
        return NextResponse.json(
            { error: "Server error", details: err.message },
            { status: 500 }
        )
    }
}
