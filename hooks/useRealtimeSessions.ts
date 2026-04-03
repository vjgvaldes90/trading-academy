"use client"

import { supabase } from "@/lib/supabase"
import { DbSession } from "@/lib/sessions"
import { useEffect } from "react"

type RealtimeEvent = {
    type: "INSERT" | "UPDATE" | "DELETE"
    sessionId: string
    bookedSlots?: number | null
    session?: DbSession
}

type UseRealtimeSessionsParams = {
    onEvent: (event: RealtimeEvent) => void
}

function toSessionRow(row: Record<string, unknown>): DbSession | null {
    const id = typeof row.id === "string" ? row.id : null
    if (!id) return null

    return {
        id,
        day: typeof row.day === "string" ? row.day : null,
        date: typeof row.date === "string" ? row.date : null,
        time: typeof row.time === "string" ? row.time : null,
        max_slots: typeof row.max_slots === "number" ? row.max_slots : null,
        booked_slots: typeof row.booked_slots === "number" ? row.booked_slots : null,
        link: typeof row.link === "string" ? row.link : null,
        isBookedByUser: false,
    }
}

export function useRealtimeSessions({ onEvent }: UseRealtimeSessionsParams) {
    useEffect(() => {
        const channel = supabase
            .channel("realtime:sessions-and-bookings")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sessions" },
                (payload) => {
                    const eventType = payload.eventType
                    const current = (payload.new ?? {}) as Record<string, unknown>
                    const previous = (payload.old ?? {}) as Record<string, unknown>
                    const sessionId = (current.id ?? previous.id) as string | undefined
                    if (!sessionId) return

                    if (eventType === "INSERT") {
                        const session = toSessionRow(current)
                        if (!session) return
                        onEvent({ type: "INSERT", sessionId, session })
                        return
                    }

                    if (eventType === "DELETE") {
                        onEvent({ type: "DELETE", sessionId })
                        return
                    }

                    const bookedSlots =
                        typeof current.booked_slots === "number" ? current.booked_slots : null
                    onEvent({ type: "UPDATE", sessionId, bookedSlots, session: toSessionRow(current) ?? undefined })
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "bookings" },
                (payload) => {
                    const eventType = payload.eventType
                    const current = (payload.new ?? {}) as Record<string, unknown>
                    const previous = (payload.old ?? {}) as Record<string, unknown>
                    const sessionId = (current.session_id ?? previous.session_id) as string | undefined
                    if (!sessionId) return
                    if (eventType === "INSERT") onEvent({ type: "INSERT", sessionId })
                    else if (eventType === "DELETE") onEvent({ type: "DELETE", sessionId })
                    else onEvent({ type: "UPDATE", sessionId })
                }
            )

        channel.subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [onEvent])
}
