"use client"

import {
    DbSession,
    buildNextSessionTicker,
    getNextSessionFromDB,
    isSessionLiveNow,
    shouldHideStudentDashboardSession,
} from "@/lib/sessions"
import {
    filterUpcomingSessionsFromToday,
    getNextWeekSessions,
    getTodaySessions,
    getWeekSessions,
} from "@/lib/sessionFiltering"
import type { AcademyAccessState } from "@/lib/academyAccess"
import {
    ACCESS_REVOKED_ERROR,
    loadDashboardFromClient,
} from "@/lib/loadDashboardFromClient"
import { getTranslations, readStoredLanguage } from "@/lib/i18n"
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

export type SessionContextValue = {
    sessions: DbSession[]
    setSessions: Dispatch<SetStateAction<DbSession[]>>
    activeTab: TabKey
    setActiveTab: (tab: TabKey) => void
    filteredSessions: DbSession[]
    updatedSessionIds: string[]
    academyAccess: AcademyAccessState
    tickerLine: string
    tickerJoinHref: string
    tickerIsLive: boolean
    showTradingActivity: boolean
    userEmail: string | null
    dashboardDataReady: boolean
    refreshDashboardSessions: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
    initialSessions,
    initialAcademyAccess,
    initialUserEmail,
    children,
}: {
    initialSessions: DbSession[]
    initialAcademyAccess: AcademyAccessState
    initialUserEmail: string | null
    children: ReactNode
}) {
    const [sessions, setSessions] = useState<DbSession[]>(initialSessions)
    const [academyAccess, setAcademyAccess] = useState<AcademyAccessState>(initialAcademyAccess)
    const [dashboardDataReady, setDashboardDataReady] = useState(initialSessions.length > 0)
    const [activeTab, setActiveTab] = useState<TabKey>("today")
    const [now, setNow] = useState(() => new Date())
    const [updatedSessionIds, setUpdatedSessionIds] = useState<string[]>([])

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
            const lang = readStoredLanguage()
            const i18n = getTranslations(lang)
            try {
                const { sessions: nextSessions, canAccess } = await loadDashboardFromClient(supabase, email)
                if (cancelled) return
                setAcademyAccess({
                    canAccess,
                    message: canAccess ? null : i18n.noActiveAccess,
                    actor: { email },
                })
                setSessions(nextSessions)
            } catch (e) {
                console.error("[SessionProvider] client dashboard load failed", e)
                if (!cancelled && e instanceof Error && e.message === ACCESS_REVOKED_ERROR) {
                    clearStoredStudent()
                    window.location.replace("/blocked")
                    return
                }
                if (!cancelled) {
                    setAcademyAccess({
                        canAccess: false,
                        message: i18n.failedToLoadCalendar,
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
        const i18n = getTranslations(readStoredLanguage())
        try {
            const { sessions: nextSessions, canAccess } = await loadDashboardFromClient(supabase, email)
            setAcademyAccess({
                canAccess,
                message: canAccess ? null : i18n.noActiveAccess,
                actor: { email },
            })
            setSessions(nextSessions)
        } catch (e) {
            console.error("[SessionProvider] refreshDashboardSessions failed", e)
            if (e instanceof Error && e.message === ACCESS_REVOKED_ERROR) {
                clearStoredStudent()
                window.location.replace("/blocked")
            }
        }
    }, [initialUserEmail])

    const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
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
                    return [...prev, event.session]
                }
                return prev
            }

            return prev.map((s) => {
                if (s.id !== event.sessionId) return s
                if (event.session) return { ...s, ...event.session }
                return s
            })
        })
    }, [])

    useRealtimeSessions({ onEvent: handleRealtimeEvent })

    const upcomingSessions = useMemo(
        () =>
            filterUpcomingSessionsFromToday(sessions, now).filter(
                (s) => !shouldHideStudentDashboardSession(s, now)
            ),
        [sessions, now]
    )

    const filteredSessions = useMemo(() => {
        if (activeTab === "today") return getTodaySessions(upcomingSessions, now)
        if (activeTab === "thisWeek") return getWeekSessions(upcomingSessions, now)
        return getNextWeekSessions(upcomingSessions, now)
    }, [activeTab, upcomingSessions, now])

    const sessionState = useMemo(() => getNextSessionFromDB(upcomingSessions, now), [upcomingSessions, now])

    const ticker = useMemo(
        () =>
            buildNextSessionTicker(sessionState, now, {
                hasPaid: academyAccess.canAccess,
            }),
        [sessionState, now, academyAccess.canAccess]
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
            academyAccess,
            tickerLine: ticker.line,
            tickerJoinHref: ticker.joinHref,
            tickerIsLive,
            showTradingActivity: upcomingSessions.length < 3,
            userEmail: initialUserEmail,
            dashboardDataReady,
            refreshDashboardSessions,
        }),
        [
            sessions,
            activeTab,
            filteredSessions,
            updatedSessionIds,
            academyAccess,
            ticker.line,
            ticker.joinHref,
            tickerIsLive,
            upcomingSessions.length,
            initialUserEmail,
            dashboardDataReady,
            refreshDashboardSessions,
        ]
    )

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
    const ctx = useContext(SessionContext)
    if (!ctx) throw new Error("useSession must be used within SessionProvider")
    return ctx
}
