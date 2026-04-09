"use client"

import type { SessionContextValue } from "@/context/SessionContext"
import { ASSIST_CHANNELS } from "@/lib/assist/channels"
import { useLearningAssist } from "@/hooks/useLearningAssist"
import { supabase } from "@/lib/supabase"
import { DbSession } from "@/lib/sessions"
import { useCallback, useRef, useState } from "react"

/** Dashboard session state (email + list updates). Not Supabase Auth. */
export type UseBookingDeps = Pick<
    SessionContextValue,
    "userEmail" | "setSessions" | "applyReserveSuccess"
>

const BOOKING_TIMEOUT_MS = 30_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(Object.assign(new Error("Tiempo agotado. Intenta de nuevo."), { name: "AbortError" }))
        }, ms)
        promise.then(
            (v) => {
                window.clearTimeout(timer)
                resolve(v)
            },
            (e) => {
                window.clearTimeout(timer)
                reject(e)
            }
        )
    })
}

export type BookingUiStatus = "idle" | "success" | "error"

type UseBookingResult = {
    isLoading: boolean
    status: BookingUiStatus
    message: string | null
    bookSession: () => Promise<void>
}

export function useBooking(
    session: DbSession,
    lockedOut: boolean,
    { userEmail, setSessions, applyReserveSuccess }: UseBookingDeps
): UseBookingResult {
    const { recordFailure, clearFailures, poke } = useLearningAssist()
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<BookingUiStatus>("idle")
    const [message, setMessage] = useState<string | null>(null)
    const rollbackRef = useRef<DbSession[] | null>(null)
    const inFlightRef = useRef(false)

    const bookSession = useCallback(async () => {
        console.log("[book click] client-only (no server route)", { sessionId: session.id })
        if (lockedOut || inFlightRef.current) return
        if (!session.id || !UUID_RE.test(session.id)) {
            setStatus("error")
            setMessage("ID de sesión inválido")
            console.error("[book client] invalid session id", { sessionId: session.id })
            return
        }
        if (!userEmail) {
            setStatus("error")
            setMessage("Debes iniciar sesión con email para reservar.")
            console.error("[book client] missing user email", {
                sessionId: session.id,
                userEmail,
            })
            return
        }

        const sessionId = session.id
        const emailNorm = userEmail.trim().toLowerCase()

        inFlightRef.current = true
        setIsLoading(true)
        setStatus("idle")
        setMessage(null)
        poke()
        rollbackRef.current = null

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

            const doBook = async () => {
                const { data: dup, error: dupErr } = await supabase
                    .from("tradingbookings")
                    .select("id")
                    .eq("session_id", sessionId)
                    .eq("email", emailNorm)
                    .maybeSingle()
                if (dupErr) {
                    throw new Error(dupErr.message || "No se pudo verificar la reserva")
                }
                if (dup) {
                    throw new Error("Ya reservaste esta sesión.")
                }

                const maxSlots = session.max_slots ?? 0
                const { count, error: countErr } = await supabase
                    .from("tradingbookings")
                    .select("*", { count: "exact", head: true })
                    .eq("session_id", sessionId)
                if (countErr) {
                    throw new Error(countErr.message || "No se pudo completar la reserva.")
                }
                const used = count ?? 0
                if (maxSlots > 0 && used >= maxSlots) {
                    throw new Error("No hay cupos disponibles")
                }

                const { data: inserted, error: insertErr } = await supabase
                    .from("tradingbookings")
                    .insert({ session_id: sessionId, email: emailNorm })
                    .select("id")
                    .single()

                if (insertErr) {
                    const msg = insertErr.message ?? ""
                    if (insertErr.code === "23505" || /duplicate|unique/i.test(msg)) {
                        throw new Error("Ya reservaste esta sesión.")
                    }
                    throw new Error(msg || "No se pudo completar la reserva.")
                }
                const bookingId = typeof inserted?.id === "string" ? inserted.id : null
                if (!bookingId) {
                    throw new Error("Reserva inválida: sin id.")
                }

                const { count: afterCount, error: afterErr } = await supabase
                    .from("tradingbookings")
                    .select("*", { count: "exact", head: true })
                    .eq("session_id", sessionId)
                const slots = afterErr ? used + 1 : (afterCount ?? used + 1)

                return { bookingId, slots }
            }

            const { bookingId, slots } = await withTimeout(doBook(), BOOKING_TIMEOUT_MS)

            console.log("[book client] insert ok", {
                sessionId,
                bookedSlots: slots,
                bookingId,
                userEmail: emailNorm,
            })
            if (!bookingId) {
                console.warn(
                    "[book client] missing bookingId in response; UI may not allow cancel until reload"
                )
            }

            applyReserveSuccess({
                sessionId,
                bookedSlots: slots,
                bookingId,
                email: userEmail,
                sessionDay: session.day,
                sessionHour: session.time,
                sessionDate: session.date,
            })

            clearFailures(ASSIST_CHANNELS.booking)
            setStatus("success")
            setMessage(null)
        } catch (error) {
            if (rollbackRef.current) setSessions(rollbackRef.current)
            recordFailure(ASSIST_CHANNELS.booking)
            const text =
                error instanceof Error
                    ? error.name === "AbortError"
                        ? "Tiempo agotado. Intenta de nuevo."
                        : error.message
                    : "No se pudo reservar"
            console.error("[book client] caught error", { sessionId, error })
            console.error(
                "FULL ERROR:",
                JSON.stringify(
                    {
                        sessionId,
                        userEmail: emailNorm,
                        error,
                    },
                    null,
                    2
                )
            )
            setStatus("error")
            setMessage(text)
        } finally {
            inFlightRef.current = false
            setIsLoading(false)
        }
    }, [
        lockedOut,
        session.id,
        session.day,
        session.time,
        session.date,
        session.booked_slots,
        session.max_slots,
        setSessions,
        applyReserveSuccess,
        userEmail,
        recordFailure,
        clearFailures,
        poke,
    ])

    return {
        isLoading,
        status,
        message,
        bookSession,
    }
}
