"use client"

import PrivateClassSection from "@/components/dashboard/focused/PrivateClassSection"
import PendingAnnouncementsCard from "@/components/dashboard/PendingAnnouncementsCard"
import type { StudentDashboardView } from "@/components/student/Sidebar"
import { useLanguage } from "@/context/LanguageProvider"
import { getStudentUpcomingLiveSessions, useSession } from "@/context/SessionContext"
import type { StudentAnnouncementItem } from "@/lib/announcements"
import {
    canShowStudentLiveJoinButton,
    getNextUpcomingSession,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
    type DbSession,
} from "@/lib/sessions"
import { BookOpen, Clapperboard, Library, LineChart } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

function NextClassHero({
    session,
    onOpenLive,
}: {
    session: DbSession | null
    onOpenLive: () => void
}) {
    const { academyAccess, userEmail } = useSession()
    const { t } = useLanguage()
    const [now, setNow] = useState(() => new Date())
    const [joining, setJoining] = useState(false)

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000)
        return () => window.clearInterval(id)
    }, [])

    const isTheory = session?.session_type === "theory"
    const typeLabel = isTheory ? t.sessionTypeTheoryClass : t.sessionTypeTradingSession

    const joinAllowed =
        session != null &&
        Boolean(userEmail) &&
        canShowStudentLiveJoinButton(session, now, {
            hasPaid: academyAccess.canAccess,
        })

    const sessionClosed =
        session != null &&
        academyAccess.canAccess &&
        isStudentSecureJoinWindowClosed(session, now) &&
        !isStudentJoinTooEarly(session, now)

    const statusText = (() => {
        if (!session) return t.noSessionsScheduled
        if (!academyAccess.canAccess) return t.accessNotAvailable
        if (sessionClosed) return t.sessionClosed
        if (joinAllowed) return t.dashboardClassAvailable
        if (isStudentJoinTooEarly(session, now)) return t.availableTenMinBefore
        return t.liveSession
    })()

    return (
        <section
            aria-labelledby="dashboard-next-class-title"
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0a0f1a] p-4 shadow-[0_20px_40px_-28px_rgba(37,99,235,0.4)] sm:p-5"
        >
            <p
                id="dashboard-next-class-title"
                className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-sky-300/90"
            >
                {t.dashboardNextClassTitle}
            </p>

            {!session ? (
                <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
                    <p className="text-sm text-slate-400">{t.noSessionsScheduled}</p>
                    <button
                        type="button"
                        onClick={onOpenLive}
                        className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-500/25"
                    >
                        {t.viewSessions}
                    </button>
                </div>
            ) : (
                <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
                                isTheory
                                    ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                                    : "border-sky-400/35 bg-sky-500/15 text-sky-200"
                            }`}
                        >
                            {typeLabel}
                        </span>
                        <h2 className="line-clamp-2 text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl">
                            {session.title?.trim() || t.liveSessionDefault}
                        </h2>
                        <p className="text-sm font-semibold text-slate-300">
                            {sessionDisplayDay(session)} · {sessionDisplayHour(session) || "—"}
                        </p>
                        <p
                            className={`text-xs font-semibold ${
                                joinAllowed
                                    ? "text-emerald-300"
                                    : !academyAccess.canAccess
                                      ? "text-amber-200"
                                      : "text-slate-400"
                            }`}
                        >
                            {statusText}
                        </p>
                    </div>

                    {joinAllowed ? (
                        <button
                            type="button"
                            disabled={joining || !userEmail}
                            onClick={() => {
                                if (!session || joining) return
                                setJoining(true)
                                window.location.assign(`/student/classroom/${session.id}`)
                            }}
                            className="w-full rounded-lg border border-red-500/40 bg-gradient-to-r from-red-600 to-red-700 px-3 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(220,38,38,0.3)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                        >
                            {joining ? t.opening : t.dashboardEnterClassNow}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onOpenLive}
                            className="w-full rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2.5 text-sm font-extrabold text-sky-100 transition hover:bg-sky-500/25"
                        >
                            {t.viewSessions}
                        </button>
                    )}
                </div>
            )}
        </section>
    )
}

function MyClassesSection({
    showTheory,
    theoryCount,
    tradingCount,
    onOpenLive,
}: {
    showTheory: boolean
    theoryCount: number
    tradingCount: number
    onOpenLive: () => void
}) {
    const { t } = useLanguage()

    const countLabel = (n: number) =>
        n === 1
            ? t.adminSessionCountOne.replace("{count}", String(n))
            : t.adminSessionCountMany.replace("{count}", String(n))

    return (
        <section
            aria-labelledby="dashboard-my-classes-title"
            className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-sm sm:p-5"
        >
            <h2
                id="dashboard-my-classes-title"
                className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-400"
            >
                {t.dashboardMyClassesTitle}
            </h2>
            <div className="mt-3 flex flex-1 flex-col gap-2.5">
                {showTheory ? (
                    <button
                        type="button"
                        onClick={onOpenLive}
                        className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] px-3 py-3 text-left transition hover:border-violet-300/40 hover:bg-violet-500/10"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/15 text-violet-200">
                                <BookOpen className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase tracking-wide text-violet-200">
                                    {t.sessionTypeTheoryClass}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">{countLabel(theoryCount)}</p>
                            </div>
                        </div>
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={onOpenLive}
                    className="rounded-xl border border-sky-400/25 bg-sky-500/[0.07] px-3 py-3 text-left transition hover:border-sky-300/40 hover:bg-sky-500/10"
                >
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/15 text-sky-200">
                            <LineChart className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-200">
                                {t.sessionTypeTradingSession}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{countLabel(tradingCount)}</p>
                        </div>
                    </div>
                </button>
            </div>
        </section>
    )
}

function ComingSoonSection({
    onOpenRecorded,
    onOpenResources,
}: {
    onOpenRecorded: () => void
    onOpenResources: () => void
}) {
    const { t } = useLanguage()
    return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wide text-slate-600">
                {t.dashboardComingSoonTitle}:
            </span>
            <button
                type="button"
                onClick={onOpenRecorded}
                className="inline-flex items-center gap-1.5 rounded-md text-slate-500 transition hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
            >
                <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t.dashboardComingSoonRecorded}
            </button>
            <span className="text-slate-700" aria-hidden>
                ·
            </span>
            <button
                type="button"
                onClick={onOpenResources}
                className="inline-flex items-center gap-1.5 rounded-md text-slate-500 transition hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
            >
                <Library className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t.dashboardComingSoonResources}
            </button>
        </p>
    )
}

export default function DashboardHome({
    userName,
    setActiveView,
    pendingAnnouncements = [],
    onViewAnnouncements,
    onReadAnnouncement,
    onDismissAnnouncement,
}: {
    userName: string
    /** @deprecated Kept for call-site compatibility; recorded classes are hidden from home. */
    onWatchNow?: () => void
    activeView?: StudentDashboardView
    setActiveView: (view: StudentDashboardView) => void
    pendingAnnouncements?: StudentAnnouncementItem[]
    onViewAnnouncements?: () => void
    onReadAnnouncement?: (announcement: StudentAnnouncementItem) => void
    onDismissAnnouncement?: (announcement: StudentAnnouncementItem) => Promise<void>
}) {
    const { sessions, subscriptionPlan, upcomingLiveSessions } = useSession()
    const { t } = useLanguage()
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000)
        return () => window.clearInterval(id)
    }, [])

    const showTheory = subscriptionPlan === "full_program"

    const liveUpcoming = useMemo(() => {
        if (upcomingLiveSessions.length > 0) return upcomingLiveSessions
        return getStudentUpcomingLiveSessions(sessions, now)
    }, [upcomingLiveSessions, sessions, now])

    const theoryCount = useMemo(
        () => liveUpcoming.filter((s) => s.session_type === "theory").length,
        [liveUpcoming]
    )
    const tradingCount = useMemo(
        () => liveUpcoming.filter((s) => s.session_type !== "theory").length,
        [liveUpcoming]
    )

    const nextSession = useMemo(() => {
        const pool = showTheory
            ? liveUpcoming
            : liveUpcoming.filter((s) => s.session_type !== "theory")
        return getNextUpcomingSession(pool, now)
    }, [liveUpcoming, showTheory, now])

    const openLive = () => setActiveView("live")

    return (
        <div className="space-y-4 sm:space-y-5">
            <header>
                <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                    {t.welcomeBack} {userName}
                </h1>
                <p className="mt-0.5 text-sm text-white/60">{t.dashboardHomeSubtitle}</p>
            </header>

            <PendingAnnouncementsCard
                announcements={pendingAnnouncements}
                onReadNow={(announcement) => {
                    if (onReadAnnouncement) onReadAnnouncement(announcement)
                    else setActiveView("announcements")
                }}
                onOpenAnnouncements={() => {
                    if (onViewAnnouncements) onViewAnnouncements()
                    else setActiveView("announcements")
                }}
                onDismiss={async (announcement) => {
                    if (onDismissAnnouncement) await onDismissAnnouncement(announcement)
                }}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                <NextClassHero session={nextSession} onOpenLive={openLive} />
                <MyClassesSection
                    showTheory={showTheory}
                    theoryCount={theoryCount}
                    tradingCount={tradingCount}
                    onOpenLive={openLive}
                />
            </div>

            <PrivateClassSection compact />

            <ComingSoonSection
                onOpenRecorded={() => setActiveView("classes")}
                onOpenResources={() => setActiveView("resources")}
            />
        </div>
    )
}
