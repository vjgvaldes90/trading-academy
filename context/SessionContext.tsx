"use client"

import {
    DbSession,
    buildNextSessionTicker,
    filterValidSessions,
    getNextSessionFromDB,
    getNextWeekSessions,
    getThisWeekSessions,
    isSessionLiveNow,
    toYmdKey,
} from "@/lib/sessions"
import type { BookingAccessState } from "@/lib/bookingAccess"
import { useRealtimeSessions } from "@/hooks/useRealtimeSessions"
import { Dispatch, SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type TabKey = "today" | "thisWeek" | "nextWeek"

type SessionContextValue = {
    sessions: DbSession[]
    setSessions: Dispatch<SetStateAction<DbSession[]>>
    activeTab: TabKey
    setActiveTab: (tab: TabKey) => void
    filteredSessions: DbSession[]
    updatedSessionIds: string[]
    bookingAccess: BookingAccessState
    tickerLine: string
    tickerJoinHref: string
    tickerIsLive: boolean
    showTradingActivity: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
    initialSessions,
    initialBookingAccess,
    children,
}: {
    initialSessions: DbSession[]
    initialBookingAccess: BookingAccessState
    children: React.ReactNode
}) {
    const [sessions, setSessions] = useState<DbSession[]>(initialSessions)
    const [activeTab, setActiveTab] = useState<TabKey>("today")
    const [now, setNow] = useState(() => new Date())
    const [updatedSessionIds, setUpdatedSessionIds] = useState<string[]>([])

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000)
        return () => clearInterval(t)
    }, [])

    const handleRealtimeEvent = useCallback(
        (event: { type: "INSERT" | "UPDATE" | "DELETE"; sessionId: string; bookedSlots?: number | null; session?: DbSession }) => {
            setUpdatedSessionIds((prev) => (prev.includes(event.sessionId) ? prev : [...prev, event.sessionId]))
            window.setTimeout(() => {
                setUpdatedSessionIds((prev) => prev.filter((id) => id !== event.sessionId))
            }, 650)

            setSessions((prev) => {
                if (event.type === "DELETE") {
                    return prev.filter((s) => s.id !== event.sessionId)
                }

                if (event.type === "INSERT") {
                    if (event.session) {
                        const exists = prev.some((s) => s.id === event.sessionId)
                        if (exists) return prev
                        return [...prev, { ...event.session, isBookedByUser: event.session.isBookedByUser ?? false }]
                    }
                    return prev
                }

                return prev.map((s) => {
                    if (s.id !== event.sessionId) return s
                    if (event.session)
                        return {
                            ...s,
                            ...event.session,
                            isBookedByUser: s.isBookedByUser,
                        }
                    if (typeof event.bookedSlots === "number")
                        return { ...s, booked_slots: event.bookedSlots }
                    return s
                })
            })
        },
        [setSessions]
    )

    useRealtimeSessions({ onEvent: handleRealtimeEvent })

    const validSessions = useMemo(() => filterValidSessions(sessions, now), [sessions, now])
    const todayKey = useMemo(() => toYmdKey(now), [now])

    const filteredSessions = useMemo(() => {
        if (activeTab === "today") return validSessions.filter((s) => s.date === todayKey)
        if (activeTab === "thisWeek") return getThisWeekSessions(validSessions, now)
        return getNextWeekSessions(validSessions, now)
    }, [activeTab, validSessions, todayKey, now])

    const sessionState = useMemo(() => getNextSessionFromDB(validSessions, now), [validSessions, now])
    const ticker = useMemo(() => buildNextSessionTicker(sessionState, now), [sessionState, now])
    const tickerIsLive = useMemo(() => {
        if (!sessionState) return false
        return sessionState.status === "live" || isSessionLiveNow(sessionState.session, now)
    }, [sessionState, now])

    const value = useMemo<SessionContextValue>(
        () => ({
            sessions,
            setSessions,
            activeTab,
            setActiveTab,
            filteredSessions,
            updatedSessionIds,
            bookingAccess: initialBookingAccess,
            tickerLine: ticker.line,
            tickerJoinHref: ticker.joinHref,
            tickerIsLive,
            showTradingActivity: validSessions.length < 3,
        }),
        [
            sessions,
            activeTab,
            filteredSessions,
            updatedSessionIds,
            initialBookingAccess,
            ticker.line,
            ticker.joinHref,
            tickerIsLive,
            validSessions.length,
        ]
    )

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
    const ctx = useContext(SessionContext)
    if (!ctx) throw new Error("useSession must be used within SessionProvider")
    return ctx
}
