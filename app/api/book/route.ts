import { NextResponse } from "next/server"
import { canUserBook, createSupabaseServiceRoleClient } from "@/lib/access"
import { resolveBookingActor } from "@/lib/bookingAccess"
import { hasUserBookingForSession, insertSessionBooking } from "@/lib/sessionBookings"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const actor = await resolveBookingActor()
        if (!actor.userId && !actor.email) {
            return NextResponse.json({ error: "Debes iniciar sesión para reservar." }, { status: 401 })
        }

        const admin = createSupabaseServiceRoleClient()

        const access = await canUserBook(admin, actor.userId, actor.email)
        if (!access.ok) {
            return NextResponse.json({ error: access.reason }, { status: 403 })
        }

        const body = await req.json().catch(() => null)
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId requerido" }, { status: 400 })
        }

        const already = await hasUserBookingForSession(admin, sessionId, actor)
        if (already) {
            return NextResponse.json({ error: "Ya reservaste esta sesión." }, { status: 409 })
        }

        const { data: session, error: sessionError } = await admin
            .from("sessions")
            .select("id, max_slots, booked_slots")
            .eq("id", sessionId)
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
        }

        const maxSlots = session.max_slots ?? 0
        const currentBooked = session.booked_slots ?? 0
        if (currentBooked >= maxSlots) {
            return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 409 })
        }

        const nextBooked = currentBooked + 1
        const { data: updated, error: updateError } = await admin
            .from("sessions")
            .update({ booked_slots: nextBooked })
            .eq("id", sessionId)
            .eq("booked_slots", currentBooked)
            .select("id, booked_slots")
            .single()

        if (updateError || !updated) {
            return NextResponse.json(
                { error: "La sesión fue actualizada por otro usuario. Intenta de nuevo." },
                { status: 409 }
            )
        }

        const inserted = await insertSessionBooking(admin, sessionId, actor)
        if (!inserted.ok) {
            await admin
                .from("sessions")
                .update({ booked_slots: currentBooked })
                .eq("id", sessionId)
                .eq("booked_slots", nextBooked)
            return NextResponse.json({ error: inserted.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: "Reserva confirmada.",
            sessionId: updated.id,
            bookedSlots: updated.booked_slots,
            isBookedByUser: true,
        })
    } catch (error) {
        console.error("[book] booking error", error)
        return NextResponse.json({ error: "No se pudo reservar" }, { status: 500 })
    }
}
