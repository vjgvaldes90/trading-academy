import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(raw: unknown): string | null {
    const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
    return s.length > 0 ? s : null
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const userEmail = normalizeEmail(
            url.searchParams.get("user_email") ??
                url.searchParams.get("userEmail") ??
                url.searchParams.get("email")
        )
        if (!userEmail) {
            return NextResponse.json({ error: "user_email query required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("bookings")
            .select("id, session_id, user_email, status, created_at")
            .eq("user_email", userEmail)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/bookings] GET", error)
            return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 })
        }

        return NextResponse.json({ bookings: data ?? [] })
    } catch (e) {
        console.error("[api/bookings] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as {
            reservation_id?: unknown
            reservationId?: unknown
            user_email?: unknown
        } | null

        const reservationId =
            typeof body?.reservation_id === "string"
                ? body.reservation_id.trim()
                : typeof body?.reservationId === "string"
                  ? body.reservationId.trim()
                  : ""
        if (!reservationId || !UUID_RE.test(reservationId)) {
            return NextResponse.json({ error: "Invalid reservation_id" }, { status: 400 })
        }
        const user_email =
            typeof body?.user_email === "string" ? body.user_email.trim().toLowerCase() : ""
        if (!user_email) {
            throw new Error("Missing user_email")
        }
        if (!EMAIL_RE.test(user_email)) {
            return NextResponse.json({ error: "Invalid user_email" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const nowIso = new Date().toISOString()
        const { data: reservation, error: reservationErr } = await supabase
            .from("reservations")
            .select("id, session_id, user_email, expires_at")
            .eq("id", reservationId)
            .gt("expires_at", nowIso)
            .maybeSingle()

        if (reservationErr) {
            console.error("[api/bookings] POST reservation lookup", reservationErr)
            return NextResponse.json({ error: "Failed to validate reservation" }, { status: 500 })
        }
        if (!reservation?.id || !reservation.session_id || !reservation.user_email) {
            return NextResponse.json({ error: "Reservation expired or not found" }, { status: 400 })
        }

        const reservationEmail =
            typeof reservation.user_email === "string"
                ? reservation.user_email.trim().toLowerCase()
                : ""
        if (!reservationEmail || reservationEmail !== user_email) {
            return NextResponse.json(
                { error: "Reservation does not belong to this user" },
                { status: 403 }
            )
        }

        const { data: booking, error: insertErr } = await supabase
            .from("bookings")
            .insert({
                session_id: reservation.session_id,
                user_email,
                status: "confirmed",
            })
            .select("id")
            .single()

        if (insertErr) {
            const code = insertErr.code
            const msg = insertErr.message ?? ""
            if (code === "23505" || /duplicate|unique/i.test(msg)) {
                return NextResponse.json({ error: "Already booked" }, { status: 409 })
            }
            console.error("[api/bookings] POST booking insert", insertErr)
            return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
        }

        const { error: deleteErr } = await supabase.from("reservations").delete().eq("id", reservation.id)
        if (deleteErr) {
            console.error("[api/bookings] POST reservation delete", deleteErr)
            if (booking?.id) {
                const { error: rollbackErr } = await supabase.from("bookings").delete().eq("id", booking.id)
                if (rollbackErr) {
                    console.error("[api/bookings] POST rollback failed", rollbackErr)
                }
            }
            return NextResponse.json({ error: "Failed to finalize booking" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            booking_id: booking.id,
        })
    } catch (e) {
        console.error("[api/bookings] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
