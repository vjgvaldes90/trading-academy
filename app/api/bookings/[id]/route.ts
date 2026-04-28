import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, context: RouteCtx) {
    try {
        const { id } = await context.params
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid booking id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: booking, error: fetchErr } = await supabase
            .from("bookings")
            .select("id, session_id")
            .eq("id", id)
            .maybeSingle()

        if (fetchErr) {
            console.error("[api/bookings/[id]] fetch", fetchErr)
            return NextResponse.json({ error: "Failed to load booking" }, { status: 500 })
        }
        if (!booking?.session_id) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 })
        }

        const sessionId = booking.session_id

        const { error: delErr } = await supabase.from("bookings").delete().eq("id", id)
        if (delErr) {
            console.error("[api/bookings/[id]] delete", delErr)
            return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
        }

        const { count: remaining, error: cntErr } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId)
        if (cntErr) {
            console.error("[api/bookings/[id]] recount bookings", cntErr)
        } else {
            const { error: syncErr } = await supabase
                .from("sessions")
                .update({ booked_slots: remaining ?? 0 })
                .eq("id", sessionId)
            if (syncErr) {
                console.error("[api/bookings/[id]] sync booked_slots", syncErr)
            }
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("[api/bookings/[id]] DELETE", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
