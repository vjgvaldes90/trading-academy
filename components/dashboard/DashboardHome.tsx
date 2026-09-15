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
            className="overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0a0f1a] p-5 shadow-[0_28px_56px_-32px_rgba(37,99,235,0.45)] sm:p-7"
        >
            <p
                id="dashboard-next-class-title"
                className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-300/90"
            >
                {t.dashboardNextClassTitle}
            </p>

            {!session ? (
                <div className="mt-4 space-y-4">
                    <p className="text-base text-slate-400">{t.noSessionsScheduled}</p>
                    <button
                        type="button"
                        onClick={onOpenLive}
                        className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-sm font-bold text-sky-100 transition hover:bg-sky-500/25"
                    >
                        {t.viewSessions}
                    </button>
                </div>
            ) : (
                <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 space-y-3">
                        <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${
                                isTheory
                                    ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                                    : "border-sky-400/35 bg-sky-500/15 text-sky-200"
                            }`}
                        >
                            {typeLabel}
                        </span>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
                            {session.title?.trim() || t.liveSessionDefault}
                        </h2>
                        <p className="text-base font-semibold text-slate-300 sm:text-lg">
                            {sessionDisplayDay(session)} · {sessionDisplayHour(session) || "—"}
                        </p>
                        <p
                            className={`text-sm font-semibold ${
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

                    <div className="flex w-full flex-col gap-2 sm:max-w-xs lg:w-auto lg:min-w-[220px]">
                        {joinAllowed ? (
                            <button
                                type="button"
                                disabled={joining || !userEmail}
                                onClick={() => {
                                    if (!session || joining) return
                                    setJoining(true)
                                    window.location.assign(`/student/classroom/${session.id}`)
                                }}
                                className="w-full rounded-xl border border-red-500/40 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(220,38,38,0.35)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                            >
                                {joining ? t.opening : t.dashboardEnterClassNow}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onOpenLive}
                                className="w-full rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-3 text-sm font-extrabold text-sky-100 transition hover:bg-sky-500/25"
                            >
                                {t.viewSessions}
                            </button>
                        )}
                    </div>
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
        <section aria-labelledby="dashboard-my-classes-title" className="space-y-4">
            <h2 id="dashboard-my-classes-title" className="text-lg font-extrabold text-slate-50">
                {t.dashboardMyClassesTitle}
            </h2>
            <div
                className={`grid grid-cols-1 gap-4 ${showTheory ? "lg:grid-cols-2" : "lg:grid-cols-1 lg:max-w-xl"}`}
            >
                {showTheory ? (
                    <button
                        type="button"
                        onClick={onOpenLive}
                        className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#151b2e] to-[#0f1424] p-5 text-left shadow-sm transition hover:border-violet-300/40 hover:bg-violet-500/5"
                    >
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-200">
                                <BookOpen className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-bold uppercase tracking-wide text-violet-200">
                                    {t.sessionTypeTheoryClass}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    {t.dashboardUpcomingClassesHint}
                                </p>
                                <p className="mt-3 text-xs font-semibold text-slate-500">
                                    {countLabel(theoryCount)}
                                </p>
                            </div>
                        </div>
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={onOpenLive}
                    className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-[#111827] to-[#0a0f1a] p-5 text-left shadow-sm transition hover:border-sky-300/40 hover:bg-sky-500/5"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-200">
                            <LineChart className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold uppercase tracking-wide text-sky-200">
                                {t.sessionTypeTradingSession}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                {t.dashboardUpcomingSessionsHint}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-slate-500">
                                {countLabel(tradingCount)}
                            </p>
                        </div>
                    </div>
                </button>
            </div>
        </section>
    )
}

function ComingSoonSection() {
    const { t } = useLanguage()
    return (
        <section
            aria-labelledby="dashboard-coming-soon-title"
            className="rounded-2xl border border-dashed border-white/15 bg-[#0c1222]/80 p-5 sm:p-6"
        >
            <h2
                id="dashboard-coming-soon-title"
                className="text-sm font-bold uppercase tracking-wider text-slate-500"
            >
                {t.dashboardComingSoonTitle}
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                    <Clapperboard className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                    <span>{t.dashboardComingSoonRecorded}</span>
                </li>
                <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                    <Library className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                    <span>{t.dashboardComingSoonResources}</span>
                </li>
            </ul>
        </section>
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
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-semibold text-slate-50 sm:text-[1.65rem]">
                    {t.welcomeBack} {userName}
                </h1>
                <p className="mt-1 text-sm text-white/60 sm:text-base">{t.dashboardHomeSubtitle}</p>
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

            <NextClassHero session={nextSession} onOpenLive={openLive} />

            <MyClassesSection
                showTheory={showTheory}
                theoryCount={theoryCount}
                tradingCount={tradingCount}
                onOpenLive={openLive}
            />

            <section aria-labelledby="dashboard-private-class-title" className="space-y-3">
                <h2 id="dashboard-private-class-title" className="sr-only">
                    {t.privateClassTitle}
                </h2>
                <PrivateClassSection />
            </section>

            <ComingSoonSection />
        </div>
    )
}
