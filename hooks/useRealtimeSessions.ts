"use client"

import { supabase } from "@/lib/supabase"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { DbSession } from "@/lib/sessions"
import { useEffect } from "react"

export type RealtimeEvent = {
    type: "INSERT" | "UPDATE" | "DELETE"
    /** Row id from `trading_sessions`, or `session_id` from `tradingbookings`. */
    sessionId: string
    scope: "trading_sessions" | "tradingbookings"
    bookedSlots?: number | null
    session?: DbSession
    /** Present for tradingbookings INSERT/DELETE when payload includes it. */
    bookingEmail?: string | null
    /** `tradingbookings.id` when present in the realtime payload. */
    bookingId?: string | null
}

type UseRealtimeSessionsParams = {
    onEvent: (event: RealtimeEvent) => void
}

export function useRealtimeSessions({ onEvent }: UseRealtimeSessionsParams) {
    useEffect(() => {
        const channel = supabase
            .channel("realtime:sessions-and-bookings")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "trading_sessions" },
                (payload) => {
                    const eventType = payload.eventType
                    const current = (payload.new ?? {}) as Record<string, unknown>
                    const previous = (payload.old ?? {}) as Record<string, unknown>
                    const sessionId = (current.id ?? previous.id) as string | undefined
                    if (!sessionId) return

                    if (eventType === "INSERT") {
                        const session = mapSupabaseSessionRow(current)
                        if (!session) return
                        onEvent({ type: "INSERT", sessionId, scope: "trading_sessions", session })
                        return
                    }

                    if (eventType === "DELETE") {
                        onEvent({ type: "DELETE", sessionId, scope: "trading_sessions" })
                        return
                    }

                    const bookedSlots =
                        typeof current.booked_slots === "number" ? current.booked_slots : null
                    onEvent({
                        type: "UPDATE",
                        sessionId,
                        scope: "trading_sessions",
                        bookedSlots,
                        session: mapSupabaseSessionRow(current) ?? undefined,
                    })
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tradingbookings" },
                (payload) => {
                    const eventType = payload.eventType
                    const current = (payload.new ?? {}) as Record<string, unknown>
                    const previous = (payload.old ?? {}) as Record<string, unknown>
                    const sessionId = (current.session_id ?? previous.session_id) as string | undefined
                    if (!sessionId) return
                    const bookingEmail =
                        typeof current.email === "string"
                            ? current.email
                            : typeof previous.email === "string"
                              ? previous.email
                              : null
                    const rowId = (current.id ?? previous.id) as string | undefined
                    const bookingId = typeof rowId === "string" && rowId.length > 0 ? rowId : null
                    if (eventType === "INSERT") {
                        onEvent({
                            type: "INSERT",
                            sessionId,
                            scope: "tradingbookings",
                            bookingEmail,
                            bookingId,
                        })
                        return
                    }
                    if (eventType === "DELETE") {
                        onEvent({
                            type: "DELETE",
                            sessionId,
                            scope: "tradingbookings",
                            bookingEmail,
                            bookingId,
                        })
                        return
                    }
                    onEvent({
                        type: "UPDATE",
                        sessionId,
                        scope: "tradingbookings",
                        bookingEmail,
                        bookingId,
                    })
                }
            )

        channel.subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [onEvent])
}
