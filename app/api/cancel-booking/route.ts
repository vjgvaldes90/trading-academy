import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as { booking_id?: unknown } | null
        const bookingId = typeof body?.booking_id === "string" ? body.booking_id.trim() : ""

        if (!bookingId || !UUID_RE.test(bookingId)) {
            return NextResponse.json({ error: "Invalid booking_id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: booking, error: lookupErr } = await supabase
            .from("bookings")
            .select("id, session_id")
            .eq("id", bookingId)
            .maybeSingle()

        if (lookupErr) {
            console.error("[api/cancel-booking] lookup", lookupErr)
            return NextResponse.json({ error: "Failed to load booking" }, { status: 500 })
        }

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 })
        }

        const sessionId =
            typeof (booking as { session_id?: unknown }).session_id === "string"
                ? (booking as { session_id: string }).session_id
                : ""

        const { error: deleteErr } = await supabase.from("bookings").delete().eq("id", bookingId)
        if (deleteErr) {
            console.error("[api/cancel-booking] delete", deleteErr)
            return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 })
        }

        if (sessionId) {
            const { count: remaining, error: cntErr } = await supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("session_id", sessionId)
            if (cntErr) {
                console.error("[api/cancel-booking] recount bookings", cntErr)
            } else {
                const { error: syncErr } = await supabase
                    .from("sessions")
                    .update({ booked_slots: remaining ?? 0 })
                    .eq("id", sessionId)
                if (syncErr) {
                    console.error("[api/cancel-booking] sync booked_slots", syncErr)
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("[api/cancel-booking] POST", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
