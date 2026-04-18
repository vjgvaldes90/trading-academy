"use client"

import { useSession } from "@/context/SessionContext"
import { useCallback, useRef, useState } from "react"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type BookingUiStatus = "idle" | "success" | "error"

type UseBookingResult = {
    isLoading: boolean
    status: BookingUiStatus
    bookSession: (sessionId: string, userEmail: string) => Promise<void>
}

export function useBooking(): UseBookingResult {
    const { refreshDashboardSessions, setSessionBookingError, setSessionBookingSuccess } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<BookingUiStatus>("idle")
    const inFlightRef = useRef(false)

    const bookSession = useCallback(
        async (sessionId: string, userEmail: string) => {
            if (inFlightRef.current) return
            inFlightRef.current = true
            try {
                setIsLoading(true)
                setStatus("idle")
                setSessionBookingError(null)
                setSessionBookingSuccess(null)

                console.log("BOOK SESSION ID:", sessionId)

                if (!sessionId || !UUID_RE.test(sessionId)) {
                    setStatus("error")
                    setSessionBookingError("ID de sesión inválido")
                    return
                }

                const emailNorm = userEmail.trim().toLowerCase()
                if (!emailNorm) {
                    setStatus("error")
                    setSessionBookingError("Debes iniciar sesión con email para reservar.")
                    return
                }

                const resSeat = await fetch("/api/reserve-seat", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: sessionId,
                        user_email: emailNorm,
                    }),
                })

                const seatData = await resSeat.json()
                console.log("Seat response:", seatData)

                if (!resSeat.ok) {
                    throw new Error((seatData as { error?: string }).error || "Session full")
                }

                const reservationId =
                    typeof (seatData as { reservation_id?: unknown }).reservation_id === "string"
                        ? (seatData as { reservation_id: string }).reservation_id
                        : ""
                if (!reservationId) {
                    throw new Error("Reservation failed")
                }

                const resBooking = await fetch("/api/bookings", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reservation_id: reservationId,
                        user_email: emailNorm,
                    }),
                })

                const bookingData = await resBooking.json()
                console.log("Booking response:", bookingData)

                if (!resBooking.ok) {
                    throw new Error((bookingData as { error?: string }).error || "Booking failed")
                }

                await refreshDashboardSessions()
                setStatus("success")
                setSessionBookingSuccess("Reserva confirmada")
            } catch (err: any) {
                console.error("BOOK ERROR:", err.message)
                setStatus("error")
                setSessionBookingError(err?.message ?? "No se pudo reservar")
                throw err
            } finally {
                setIsLoading(false)
                inFlightRef.current = false
            }
        },
        [refreshDashboardSessions, setSessionBookingError, setSessionBookingSuccess]
    )

    return { isLoading, status, bookSession }
}
