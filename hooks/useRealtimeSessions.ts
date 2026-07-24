"use client"

import { supabase } from "@/lib/supabase"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { stripSensitiveSessionFields } from "@/lib/secureZoomJoin"
import { DbSession } from "@/lib/sessions"
import { useEffect } from "react"

export type RealtimeEvent = {
    type: "INSERT" | "UPDATE" | "DELETE"
    sessionId: string
    session?: DbSession
}

type UseRealtimeSessionsParams = {
    onEvent: (event: RealtimeEvent) => void
}

export function useRealtimeSessions({ onEvent }: UseRealtimeSessionsParams) {
    useEffect(() => {
        const channel = supabase
            .channel("realtime:sessions")
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
                        const session = mapSupabaseSessionRow(stripSensitiveSessionFields(current))
                        if (!session) return
                        onEvent({ type: "INSERT", sessionId, session })
                        return
                    }

                    if (eventType === "DELETE") {
                        onEvent({ type: "DELETE", sessionId })
                        return
                    }

                    onEvent({
                        type: "UPDATE",
                        sessionId,
                        session: mapSupabaseSessionRow(stripSensitiveSessionFields(current)) ?? undefined,
                    })
                }
            )

        channel.subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [onEvent])
}
