import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const session_id = typeof body?.session_id === "string" ? body.session_id.trim() : ""
        const user_email =
            typeof body?.user_email === "string" ? body.user_email.trim().toLowerCase() : ""

        if (!session_id || !UUID_RE.test(session_id)) {
            return Response.json({ error: "session_id inválido" }, { status: 400 })
        }
        if (!user_email || !EMAIL_RE.test(user_email)) {
            return Response.json({ error: "user_email inválido" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", user_email)
            .maybeSingle()
        if (accessErr) {
            console.error("[reserve-seat] trading_students access check", accessErr)
            return Response.json({ error: "Error verificando acceso" }, { status: 500 })
        }
        const accessEv = evaluateAcademyAccess(accessRow as TradingStudentAccessRow | null)
        if (!accessEv.ok) {
            return Response.json(
                { error: accessEv.reason === "inactive" ? "Access revoked" : "Access denied" },
                { status: 403 }
            )
        }

        const { data: sessionRow, error: sessionErr } = await supabase
            .from("sessions")
            .select("capacity, booked_slots")
            .eq("id", session_id)
            .eq("status", "active")
            .maybeSingle()

        if (sessionErr) {
            console.error("[reserve-seat] sessions lookup failed", sessionErr)
            return Response.json({ error: "Error consultando sesión" }, { status: 500 })
        }
        if (!sessionRow) {
            return Response.json({ error: "Session not found" }, { status: 404 })
        }

        const capacity =
            typeof (sessionRow as { capacity?: unknown }).capacity === "number"
                ? (sessionRow as { capacity: number }).capacity
                : 0

        const columnBooked =
            typeof (sessionRow as { booked_slots?: unknown }).booked_slots === "number" &&
            Number.isFinite((sessionRow as { booked_slots: number }).booked_slots)
                ? Math.max(0, (sessionRow as { booked_slots: number }).booked_slots)
                : 0

        const nowIso = new Date().toISOString()

        const { count: bookings_confirmados, error: bookingsErr } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("session_id", session_id)
        if (bookingsErr) {
            console.error("[reserve-seat] bookings count failed", bookingsErr)
            return Response.json({ error: "Error consultando bookings" }, { status: 500 })
        }

        const { count: reservations_activas, error: reservationsErr } = await supabase
            .from("reservations")
            .select("id", { count: "exact", head: true })
            .eq("session_id", session_id)
            .gt("expires_at", nowIso)
        if (reservationsErr) {
            console.error("[reserve-seat] reservations count failed", reservationsErr)
            return Response.json({ error: "Error consultando reservations" }, { status: 500 })
        }

        const { data: existingBooking, error: existingBookingErr } = await supabase
            .from("bookings")
            .select("id")
            .eq("session_id", session_id)
            .eq("user_email", user_email)
            .limit(1)
        if (existingBookingErr) {
            console.error("[reserve-seat] duplicate booking check failed", existingBookingErr)
            return Response.json({ error: "Error validando booking" }, { status: 500 })
        }
        if (existingBooking && existingBooking.length > 0) {
            return Response.json({ error: "User already has an active booking" }, { status: 400 })
        }

        const { data: existingReservation, error: existingReservationErr } = await supabase
            .from("reservations")
            .select("id")
            .eq("session_id", session_id)
            .eq("user_email", user_email)
            .gt("expires_at", nowIso)
            .limit(1)
        if (existingReservationErr) {
            console.error("[reserve-seat] duplicate reservation check failed", existingReservationErr)
            return Response.json({ error: "Error validando reservation" }, { status: 500 })
        }
        if (existingReservation && existingReservation.length > 0) {
            return Response.json({ error: "User already has an active reservation" }, { status: 400 })
        }

        const ledgerBooked = Math.max(columnBooked, bookings_confirmados ?? 0)
        const available_spots =
            capacity - ledgerBooked - (reservations_activas ?? 0)

        if (available_spots <= 0) {
            return Response.json({ error: "Session full" }, { status: 400 })
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        const { data: reservation, error: insertErr } = await supabase
            .from("reservations")
            .insert({
                session_id,
                user_email,
                expires_at: expiresAt,
            })
            .select("id, expires_at")
            .single()

        if (insertErr) {
            console.error("INSERT ERROR FULL:", insertErr)
            return Response.json(
                {
                    error: "No se pudo crear reservation",
                    details: insertErr.message,
                },
                { status: 500 }
            )
        }

        const reservationId =
            typeof reservation?.id === "string" ? reservation.id : null
        const totalAfter = ledgerBooked + (reservations_activas ?? 0) + 1

        // Concurrency safeguard: if another request filled capacity in parallel, rollback this reservation.
        if (totalAfter > capacity) {
            if (reservationId) {
                const { error: rollbackErr } = await supabase
                    .from("reservations")
                    .delete()
                    .eq("id", reservationId)
                if (rollbackErr) {
                    console.error("[reserve-seat] rollback failed", rollbackErr)
                }
            }
            return Response.json({ error: "Session full" }, { status: 400 })
        }

        return Response.json({
            success: true,
            reservation_id: reservationId,
            expires_at: reservation?.expires_at ?? expiresAt,
        })
    } catch (err: unknown) {
        console.error("SERVER ERROR:", err)
        return Response.json(
            { error: "Server error", details: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        )
    }
}
