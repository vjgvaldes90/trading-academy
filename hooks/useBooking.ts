"use client"

import { useSession } from "@/context/SessionContext"
import { ASSIST_CHANNELS } from "@/lib/assist/channels"
import { useLearningAssist } from "@/hooks/useLearningAssist"
import { DbSession } from "@/lib/sessions"
import { useCallback, useEffect, useRef, useState } from "react"

const BOOKING_TIMEOUT_MS = 30_000

export type BookingUiStatus = "idle" | "success" | "error"

export type UseBookingOptions = {
    /** Tras confirmar cupo en servidor (útil para toast / feedback). */
    onReserved?: () => void
}

type UseBookingResult = {
    isLoading: boolean
    status: BookingUiStatus
    message: string | null
    bookSession: () => Promise<void>
}

export function useBooking(session: DbSession, lockedOut: boolean, options?: UseBookingOptions): UseBookingResult {
    const { setSessions } = useSession()
    const { recordFailure, clearFailures, poke } = useLearningAssist()
    const onReservedRef = useRef(options?.onReserved)
    onReservedRef.current = options?.onReserved
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<BookingUiStatus>("idle")
    const [message, setMessage] = useState<string | null>(null)
    const rollbackRef = useRef<DbSession[] | null>(null)
    const inFlightRef = useRef(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const bookSession = useCallback(async () => {
        if (lockedOut || inFlightRef.current) return

        inFlightRef.current = true
        const abortController = new AbortController()
        const timeoutId = window.setTimeout(() => abortController.abort(), BOOKING_TIMEOUT_MS)

        poke()
        rollbackRef.current = null
        setStatus("idle")
        setMessage(null)
        setIsLoading(true)

        try {
            setSessions((prev) => {
                rollbackRef.current = prev
                return prev.map((s) => {
                    if (s.id !== session.id) return s
                    const maxSlots = s.max_slots ?? 0
                    const currentBooked = s.booked_slots ?? 0
                    if (currentBooked >= maxSlots) return s
                    return { ...s, booked_slots: currentBooked + 1 }
                })
            })

            const response = await fetch("/api/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: session.id }),
                signal: abortController.signal,
            })
            const payload = (await response.json().catch(() => null)) as
                | {
                      error?: string
                      bookedSlots?: number
                      sessionId?: string
                      isBookedByUser?: boolean
                  }
                | null

            if (!response.ok) {
                throw new Error(payload?.error || "No se pudo completar la reserva")
            }

            const sessionId = session.id
            const bookedSlots = payload?.bookedSlots

            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId
                        ? {
                              ...s,
                              booked_slots: typeof bookedSlots === "number" ? bookedSlots : s.booked_slots,
                              isBookedByUser: true,
                          }
                        : s
                )
            )

            clearFailures(ASSIST_CHANNELS.booking)
            setStatus("success")
            setMessage(null)
            onReservedRef.current?.()
        } catch (error) {
            if (rollbackRef.current) setSessions(rollbackRef.current)
            recordFailure(ASSIST_CHANNELS.booking)
            const text =
                error instanceof Error
                    ? error.name === "AbortError"
                        ? "Tiempo agotado. Intenta de nuevo."
                        : error.message
                    : "No se pudo reservar"
            setStatus("error")
            setMessage(text)
        } finally {
            window.clearTimeout(timeoutId)
            inFlightRef.current = false
            if (mountedRef.current) setIsLoading(false)
        }
    }, [lockedOut, session.id, setSessions, recordFailure, clearFailures, poke])

    return {
        isLoading,
        status,
        message,
        bookSession,
    }
}
