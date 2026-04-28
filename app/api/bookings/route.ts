import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

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

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", userEmail)
            .maybeSingle()
        if (accessErr) {
            console.error("[api/bookings] GET access check", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }
        const accessEv = evaluateAcademyAccess(accessRow as TradingStudentAccessRow | null)
        if (!accessEv.ok) {
            return NextResponse.json(
                { error: "Access denied", reason: accessEv.reason ?? "not_found" },
                { status: 403 }
            )
        }

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

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", user_email)
            .maybeSingle()
        if (accessErr) {
            console.error("[api/bookings] POST access check", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }
        const accessEv = evaluateAcademyAccess(accessRow as TradingStudentAccessRow | null)
        if (!accessEv.ok) {
            return NextResponse.json(
                { error: accessEv.reason === "inactive" ? "Access revoked" : "Access denied" },
                { status: 403 }
            )
        }

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

        const sessionId = reservation.session_id

        const { data: existingBooking, error: existingErr } = await supabase
            .from("bookings")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_email", user_email)
            .maybeSingle()

        if (existingErr) {
            console.error("[api/bookings] POST duplicate booking check", existingErr)
            return NextResponse.json({ error: "Failed to validate booking" }, { status: 500 })
        }
        if (existingBooking?.id) {
            return NextResponse.json({ error: "Already reserved" }, { status: 409 })
        }

        const { data: sessionRow, error: sessionErr } = await supabase
            .from("sessions")
            .select("id, capacity, booked_slots, status")
            .eq("id", sessionId)
            .maybeSingle()

        if (sessionErr) {
            console.error("[api/bookings] POST session lookup", sessionErr)
            return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
        }
        const sessionStatus = (sessionRow as { status?: unknown }).status
        if (
            !sessionRow ||
            (typeof sessionStatus === "string" && sessionStatus.length > 0 && sessionStatus !== "active")
        ) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const capacity =
            typeof (sessionRow as { capacity?: unknown }).capacity === "number" &&
            Number.isFinite((sessionRow as { capacity: number }).capacity)
                ? Math.max(0, (sessionRow as { capacity: number }).capacity)
                : 0
        if (capacity <= 0) {
            return NextResponse.json({ error: "Session has no capacity" }, { status: 400 })
        }

        const { count: bookingsBefore, error: countBeforeErr } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId)

        if (countBeforeErr) {
            console.error("[api/bookings] POST bookings count", countBeforeErr)
            return NextResponse.json({ error: "Failed to validate capacity" }, { status: 500 })
        }
        if ((bookingsBefore ?? 0) >= capacity) {
            return NextResponse.json({ error: "Session full" }, { status: 400 })
        }

        const { data: booking, error: insertErr } = await supabase
            .from("bookings")
            .insert({
                session_id: sessionId,
                user_email,
                status: "confirmed",
            })
            .select("id")
            .single()

        if (insertErr) {
            const code = insertErr.code
            const msg = insertErr.message ?? ""
            if (code === "23505" || /duplicate|unique/i.test(msg)) {
                return NextResponse.json({ error: "Already reserved" }, { status: 409 })
            }
            console.error("[api/bookings] POST booking insert", insertErr)
            return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
        }

        const { count: bookingsAfter, error: countAfterErr } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId)

        if (countAfterErr) {
            console.error("[api/bookings] POST bookings recount", countAfterErr)
            if (booking?.id) {
                await supabase.from("bookings").delete().eq("id", booking.id)
            }
            return NextResponse.json({ error: "Failed to finalize booking" }, { status: 500 })
        }

        if ((bookingsAfter ?? 0) > capacity) {
            if (booking?.id) {
                const { error: rollbackDel } = await supabase.from("bookings").delete().eq("id", booking.id)
                if (rollbackDel) {
                    console.error("[api/bookings] POST over-capacity rollback", rollbackDel)
                }
            }
            return NextResponse.json({ error: "Session full" }, { status: 400 })
        }

        const { error: syncSlotsErr } = await supabase
            .from("sessions")
            .update({ booked_slots: bookingsAfter ?? 0 })
            .eq("id", sessionId)

        if (syncSlotsErr) {
            console.error("[api/bookings] POST booked_slots sync", syncSlotsErr)
            if (booking?.id) {
                await supabase.from("bookings").delete().eq("id", booking.id)
            }
            const { count: resync } = await supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("session_id", sessionId)
            await supabase.from("sessions").update({ booked_slots: resync ?? 0 }).eq("id", sessionId)
            return NextResponse.json({ error: "Failed to update session capacity" }, { status: 500 })
        }

        const { error: deleteErr } = await supabase.from("reservations").delete().eq("id", reservation.id)
        if (deleteErr) {
            console.error("[api/bookings] POST reservation delete", deleteErr)
            if (booking?.id) {
                const { error: rollbackBookingErr } = await supabase.from("bookings").delete().eq("id", booking.id)
                if (rollbackBookingErr) {
                    console.error("[api/bookings] POST rollback booking failed", rollbackBookingErr)
                }
            }
            const { count: bookingsRollback } = await supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("session_id", sessionId)
            await supabase
                .from("sessions")
                .update({ booked_slots: bookingsRollback ?? 0 })
                .eq("id", sessionId)
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
