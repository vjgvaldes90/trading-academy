"use client"

import {
    DbSession,
    buildNextSessionTicker,
    getNextSessionFromDB,
    isSessionLiveNow,
    shouldHideStudentDashboardSession,
} from "@/lib/sessions"
import {
    filterBookableSessionsFromToday,
    getNextWeekSessions,
    getTodaySessions,
    getWeekSessions,
} from "@/lib/sessionFiltering"
import type { BookingAccessState } from "@/lib/bookingAccess"
import {
    ACCESS_REVOKED_ERROR,
    loadDashboardFromClient,
} from "@/lib/loadDashboardFromClient"
import { clearStoredStudent } from "@/lib/studentLocalStorage"
import { supabase } from "@/lib/supabase"
import { useRealtimeSessions, type RealtimeEvent } from "@/hooks/useRealtimeSessions"
import {
    type ReactNode,
    Dispatch,
    SetStateAction,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

export type TabKey = "today" | "thisWeek" | "nextWeek"

/** One row from `bookings` for the logged-in student (+ display fields). */
export type MyBooking = {
    id: string
    session_id: string
    email: string
    sessionDay: string | null
    sessionHour: string | null
    sessionDate: string | null
}

function sortMyBookings(a: MyBooking, b: MyBooking): number {
    const da = a.sessionDate ?? ""
    const db = b.sessionDate ?? ""
    if (da !== db) return da.localeCompare(db)
    return (a.sessionHour ?? "").localeCompare(b.sessionHour ?? "")
}

export type SessionContextValue = {
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
    userEmail: string | null
    myBookings: MyBooking[]
    /** Optimistic UI after reserve (optional; refresh from API is preferred). */
    applyReserveSuccess: (args: {
        sessionId: string
        bookedSlots: number
        bookingId: string | null
        email: string | null
        sessionDay: string | null
        sessionHour: string | null
        sessionDate: string | null
    }) => void
    cancelMyBooking: (bookingId: string, sessionId: string) => Promise<{ ok: boolean; error?: string }>
    /** False until client finished loading sessions/bookings from Supabase (no server RSC queries). */
    dashboardDataReady: boolean
    /** Re-fetch sessions/bookings from Supabase (e.g. after a successful reserve). */
    refreshDashboardSessions: () => Promise<void>
    /** Which session is currently reserving (dashboard); null if idle. */
    bookingLoadingSessionId: string | null
    setBookingLoadingSessionId: Dispatch<SetStateAction<string | null>>
    /** Inline banner above session lists (errors). */
    sessionBookingError: string | null
    setSessionBookingError: Dispatch<SetStateAction<string | null>>
    /** Inline banner above session lists (success). */
    sessionBookingSuccess: string | null
    setSessionBookingSuccess: Dispatch<SetStateAction<string | null>>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
    initialSessions,
    initialBookingAccess,
    initialUserEmail,
    initialMyBookings,
    children,
}: {
    initialSessions: DbSession[]
    initialBookingAccess: BookingAccessState
    initialUserEmail: string | null
    initialMyBookings: MyBooking[]
    children: ReactNode
}) {
    const [sessions, setSessions] = useState<DbSession[]>(initialSessions)
    const [myBookings, setMyBookings] = useState<MyBooking[]>(() =>
        [...initialMyBookings].sort(sortMyBookings)
    )
    const [bookingAccess, setBookingAccess] = useState<BookingAccessState>(initialBookingAccess)
    const [dashboardDataReady, setDashboardDataReady] = useState(initialSessions.length > 0)
    const [activeTab, setActiveTab] = useState<TabKey>("today")
    const [now, setNow] = useState(() => new Date())
    const [updatedSessionIds, setUpdatedSessionIds] = useState<string[]>([])
    const [bookingLoadingSessionId, setBookingLoadingSessionId] = useState<string | null>(null)
    const [sessionBookingError, setSessionBookingError] = useState<string | null>(null)
    const [sessionBookingSuccess, setSessionBookingSuccess] = useState<string | null>(null)

    useEffect(() => {
        if (!sessionBookingSuccess) return
        const t = window.setTimeout(() => setSessionBookingSuccess(null), 4200)
        return () => window.clearTimeout(t)
    }, [sessionBookingSuccess])

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        if (initialSessions.length > 0) {
            setDashboardDataReady(true)
            return
        }
        const email = initialUserEmail?.trim().toLowerCase() ?? ""
        if (!email) {
            setDashboardDataReady(true)
            return
        }

        let cancelled = false
        ;(async () => {
            try {
                const { sessions: nextSessions, myBookings: nextMine, canBook } =
                    await loadDashboardFromClient(supabase, email)
                if (cancelled) return
                setBookingAccess({
                    canBook,
                    message: canBook ? null : "No tienes acceso activo. Compra acceso para reservar cupos.",
                    actor: { email },
                })
                setSessions(nextSessions)
                setMyBookings([...nextMine].sort(sortMyBookings))
            } catch (e) {
                console.error("[SessionProvider] client dashboard load failed", e)
                if (!cancelled && e instanceof Error && e.message === ACCESS_REVOKED_ERROR) {
                    clearStoredStudent()
                    window.location.replace("/blocked")
                    return
                }
                if (!cancelled) {
                    setBookingAccess({
                        canBook: false,
                        message: "No pudimos cargar el calendario. Recarga la página.",
                        actor: { email },
                    })
                }
            } finally {
                if (!cancelled) setDashboardDataReady(true)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [initialSessions.length, initialUserEmail])

    const refreshDashboardSessions = useCallback(async () => {
        const email = initialUserEmail?.trim().toLowerCase() ?? ""
        if (!email) return
        try {
            const { sessions: nextSessions, myBookings: nextMine, canBook } =
                await loadDashboardFromClient(supabase, email)
            setBookingAccess({
                canBook,
                message: canBook ? null : "No tienes acceso activo. Compra acceso para reservar cupos.",
                actor: { email },
            })
            setSessions(nextSessions)
            setMyBookings([...nextMine].sort(sortMyBookings))
        } catch (e) {
            console.error("[SessionProvider] refreshDashboardSessions failed", e)
            if (e instanceof Error && e.message === ACCESS_REVOKED_ERROR) {
                clearStoredStudent()
                window.location.replace("/blocked")
            }
        }
    }, [initialUserEmail])

    const applyReserveSuccess = useCallback(
        (args: {
            sessionId: string
            bookedSlots: number
            bookingId: string | null
            email: string | null
            sessionDay: string | null
            sessionHour: string | null
            sessionDate: string | null
        }) => {
            const { sessionId, bookingId, email, sessionDay, sessionHour, sessionDate } = args
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, isBookedByUser: true } : s
                )
            )
            if (bookingId && email) {
                setMyBookings((prev) => {
                    if (prev.some((x) => x.id === bookingId || x.session_id === sessionId)) return prev
                    return [
                        ...prev,
                        {
                            id: bookingId,
                            session_id: sessionId,
                            email,
                            sessionDay,
                            sessionHour,
                            sessionDate,
                        },
                    ].sort(sortMyBookings)
                })
            }
        },
        []
    )

    const cancelMyBooking = useCallback(
        async (bookingId: string, sessionId: string) => {
            void sessionId
            const email = initialUserEmail?.trim().toLowerCase() ?? ""
            if (!email) {
                return { ok: false as const, error: "Sesión no disponible" }
            }
            try {
                const res = await fetch("/api/cancel-booking", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ booking_id: bookingId }),
                })
                if (!res.ok) {
                    const data = (await res.json().catch(() => ({}))) as { error?: string }
                    console.error("[cancelMyBooking]", res.status, data)
                    return {
                        ok: false as const,
                        error: data.error || "No se pudo cancelar",
                    }
                }
                await refreshDashboardSessions()
                return { ok: true as const }
            } catch (e) {
                console.error("[cancelMyBooking]", e)
                return { ok: false as const, error: "No se pudo cancelar" }
            }
        },
        [initialUserEmail, refreshDashboardSessions]
    )

    const handleRealtimeEvent = useCallback(
        (event: RealtimeEvent) => {
            setUpdatedSessionIds((prev) => (prev.includes(event.sessionId) ? prev : [...prev, event.sessionId]))
            window.setTimeout(() => {
                setUpdatedSessionIds((prev) => prev.filter((id) => id !== event.sessionId))
            }, 650)

            const bookingIsMine =
                Boolean(initialUserEmail) &&
                event.bookingEmail != null &&
                event.bookingEmail === initialUserEmail

            setSessions((prev) => {
                if (event.type === "DELETE" && event.scope === "trading_sessions") {
                    return prev.filter((s) => s.id !== event.sessionId)
                }

                if (event.type === "DELETE" && event.scope === "bookings") {
                    return prev.map((s) => {
                        if (s.id !== event.sessionId) return s
                        return {
                            ...s,
                            ...(bookingIsMine ? { isBookedByUser: false } : {}),
                        }
                    })
                }

                if (event.type === "INSERT" && event.scope === "bookings") {
                    return prev.map((s) => {
                        if (s.id !== event.sessionId) return s
                        return {
                            ...s,
                            ...(bookingIsMine ? { isBookedByUser: true } : {}),
                        }
                    })
                }

                if (event.type === "INSERT" && event.scope === "trading_sessions") {
                    if (event.session) {
                        const exists = prev.some((s) => s.id === event.sessionId)
                        if (exists) return prev
                        return [...prev, { ...event.session, isBookedByUser: event.session.isBookedByUser ?? false }]
                    }
                    return prev
                }

                if (event.type === "UPDATE" && event.scope === "bookings") {
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

            if (event.type === "DELETE" && event.scope === "bookings" && bookingIsMine) {
                setMyBookings((p) => {
                    if (event.bookingId) return p.filter((x) => x.id !== event.bookingId)
                    return p.filter((x) => x.session_id !== event.sessionId)
                })
            }
            if (event.type === "INSERT" && event.scope === "bookings" && bookingIsMine && initialUserEmail) {
                setMyBookings((prev) => {
                    if (prev.some((x) => x.session_id === event.sessionId)) return prev
                    const bid =
                        typeof event.bookingId === "string" && event.bookingId.length > 0
                            ? event.bookingId
                            : `realtime:${event.sessionId}`
                    return [
                        ...prev,
                        {
                            id: bid,
                            session_id: event.sessionId,
                            email: initialUserEmail,
                            sessionDay: null,
                            sessionHour: null,
                            sessionDate: null,
                        },
                    ].sort(sortMyBookings)
                })
            }
        },
        [initialUserEmail]
    )

    useRealtimeSessions({ onEvent: handleRealtimeEvent })

    const bookableSessions = useMemo(
        () =>
            filterBookableSessionsFromToday(sessions, now).filter(
                (s) => !shouldHideStudentDashboardSession(s, now)
            ),
        [sessions, now]
    )

    const filteredSessions = useMemo(() => {
        if (activeTab === "today") return getTodaySessions(bookableSessions, now)
        if (activeTab === "thisWeek") return getWeekSessions(bookableSessions, now)
        return getNextWeekSessions(bookableSessions, now)
    }, [activeTab, bookableSessions, now])

    const sessionState = useMemo(() => getNextSessionFromDB(bookableSessions, now), [bookableSessions, now])

    const tickerHasReservation = useMemo(() => {
        if (!sessionState) return false
        const email = initialUserEmail?.trim().toLowerCase() ?? ""
        if (!email) return false
        return myBookings.some(
            (b) => b.session_id === sessionState.session.id && b.email.trim().toLowerCase() === email
        )
    }, [sessionState, myBookings, initialUserEmail])

    const ticker = useMemo(
        () =>
            buildNextSessionTicker(sessionState, now, {
                hasPaid: bookingAccess.canBook,
                hasReservation: tickerHasReservation,
            }),
        [sessionState, now, bookingAccess.canBook, tickerHasReservation]
    )
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
            bookingAccess,
            tickerLine: ticker.line,
            tickerJoinHref: ticker.joinHref,
            tickerIsLive,
            showTradingActivity: bookableSessions.length < 3,
            userEmail: initialUserEmail,
            myBookings,
            applyReserveSuccess,
            cancelMyBooking,
            dashboardDataReady,
            refreshDashboardSessions,
            bookingLoadingSessionId,
            setBookingLoadingSessionId,
            sessionBookingError,
            setSessionBookingError,
            sessionBookingSuccess,
            setSessionBookingSuccess,
        }),
        [
            sessions,
            activeTab,
            filteredSessions,
            updatedSessionIds,
            bookingAccess,
            ticker.line,
            ticker.joinHref,
            tickerIsLive,
            bookableSessions.length,
            initialUserEmail,
            myBookings,
            applyReserveSuccess,
            cancelMyBooking,
            dashboardDataReady,
            refreshDashboardSessions,
            bookingLoadingSessionId,
            sessionBookingError,
            sessionBookingSuccess,
        ]
    )

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
    const ctx = useContext(SessionContext)
    if (!ctx) throw new Error("useSession must be used within SessionProvider")
    return ctx
}
