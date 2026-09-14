"use client"

import { useSession } from "@/context/SessionContext"
import { useLanguage } from "@/context/LanguageProvider"
import {
    canShowStudentLiveJoinButton,
    DbSession,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

function SlotRow({ session }: { session: DbSession }) {
    const { academyAccess, userEmail } = useSession()
    const { t } = useLanguage()
    const router = useRouter()
    const now = new Date()
    const canAccess = academyAccess.canAccess
    const [joining, setJoining] = useState(false)

    const label = `${sessionDisplayDay(session)} · ${sessionDisplayHour(session) || "—"}`
    const title = session.title?.trim() || t.liveSessionDefault
    const isTheory = session.session_type === "theory"
    const typeLabel = isTheory ? t.sessionTypeTheoryClass : t.sessionTypeTradingSession

    const mayOpenLiveJoin = canShowStudentLiveJoinButton(session, now, {
        hasPaid: canAccess,
    })

    const handleSecureJoin = async () => {
        if (!userEmail || joining) return
        setJoining(true)
        try {
            router.push(`/student/classroom/${session.id}`)
        } finally {
            setJoining(false)
        }
    }

    const sessionClosed =
        canAccess &&
        isStudentSecureJoinWindowClosed(session, now) &&
        !isStudentJoinTooEarly(session, now)

    let statusText = t.liveSession
    let statusClass = "text-emerald-300"
    if (!canAccess) {
        statusText = t.accessNotAvailable
        statusClass = "text-amber-200"
    } else if (sessionClosed) {
        statusText = t.sessionClosed
        statusClass = "text-slate-400"
    } else if (mayOpenLiveJoin) {
        statusText = t.available
        statusClass = "text-emerald-300"
    } else if (isStudentJoinTooEarly(session, now)) {
        statusText = t.availableTenMinBefore
        statusClass = "text-slate-400"
    }

    return (
        <article className="flex flex-col rounded-xl border border-white/10 bg-[#0f172a]/80 transition-colors hover:border-sky-500/25">
            <div className="border-b border-white/10 px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100">{title}</h3>
                <span
                    className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
                        isTheory
                            ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                            : "border-sky-400/35 bg-sky-500/15 text-sky-200"
                    }`}
                >
                    {typeLabel}
                </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                <div>
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
                        {t.statusLabel}
                    </p>
                    <p className={`mt-0.5 text-sm font-semibold ${statusClass}`}>{statusText}</p>
                </div>
            </div>

            {(!canAccess || mayOpenLiveJoin) ? (
                <div className="mt-auto flex flex-col gap-2 border-t border-white/10 bg-black/20 px-3 py-3">
                    {!canAccess ? (
                        <Link
                            href="/pricing"
                            className="inline-flex w-full items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20"
                        >
                            {t.getAccess}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled={joining}
                            onClick={() => void handleSecureJoin()}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-red-500/45 bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
                        >
                            {joining ? t.opening : t.joinLiveSession}
                        </button>
                    )}
                </div>
            ) : null}
        </article>
    )
}

/** Same column chrome as AdminSessions `SessionCategoryBlock`. */
function SessionCategoryBlock({
    title,
    countLabel,
    sessions,
    emptyMessage,
}: {
    title: string
    countLabel: string
    sessions: DbSession[]
    emptyMessage: string
}) {
    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#111827] to-[#0a0f1a] shadow-[0_28px_56px_-32px_rgba(37,99,235,0.35)]">
            <div className="border-b border-sky-500/15 px-4 py-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">{title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{countLabel}</p>
            </div>
            {sessions.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
            ) : (
                <ul className="divide-y divide-white/[0.06]">
                    {sessions.map((s) => (
                        <li key={s.id} className="p-4">
                            <SlotRow session={s} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default function BookSessionSection() {
    const { upcomingLiveSessions, subscriptionPlan, sessions } = useSession()
    const { t } = useLanguage()

    const showTheoryColumn = subscriptionPlan === "full_program"

    const theoryUpcoming = useMemo(
        () => upcomingLiveSessions.filter((s) => s.session_type === "theory"),
        [upcomingLiveSessions]
    )
    const tradingUpcoming = useMemo(
        () => upcomingLiveSessions.filter((s) => s.session_type !== "theory"),
        [upcomingLiveSessions]
    )

    const sessionCountLabel = useCallback(
        (count: number) =>
            count === 1
                ? t.adminSessionCountOne.replace("{count}", String(count))
                : t.adminSessionCountMany.replace("{count}", String(count)),
        [t]
    )

    const visibleTotal = showTheoryColumn
        ? theoryUpcoming.length + tradingUpcoming.length
        : tradingUpcoming.length

    return (
        <section id="sesiones-en-vivo" aria-labelledby="sesiones-en-vivo-title" className="space-y-4">
            <h2 id="sesiones-en-vivo-title" className="sr-only">
                {t.liveSessionsTitle}
            </h2>

            {!sessions?.length ? (
                <p className="text-center text-sm text-slate-500">{t.noSessionsAvailableYet}</p>
            ) : (
                <>
                    {showTheoryColumn ? (
                        <>
                            {/* Same summary strip as AdminSessions (Full Program only) */}
                            <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#111827] to-[#0a0f1a] px-4 py-4 shadow-[0_28px_56px_-32px_rgba(37,99,235,0.45)]">
                                <h2 className="text-base font-bold tracking-tight text-slate-100">
                                    {t.adminScheduledSessions}
                                </h2>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                    {sessionCountLabel(visibleTotal)}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <SessionCategoryBlock
                                    title={t.sessionTypeTheoryClass}
                                    countLabel={sessionCountLabel(theoryUpcoming.length)}
                                    sessions={theoryUpcoming}
                                    emptyMessage={t.adminNoTheoryClassesScheduled}
                                />
                                <SessionCategoryBlock
                                    title={t.sessionTypeTradingSession}
                                    countLabel={sessionCountLabel(tradingUpcoming.length)}
                                    sessions={tradingUpcoming}
                                    emptyMessage={t.adminNoTradingSessionsScheduled}
                                />
                            </div>
                        </>
                    ) : (
                        /* Trading Only: one Admin-width column (same SessionCategoryBlock chrome), no theory column */
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <SessionCategoryBlock
                                title={t.sessionTypeTradingSession}
                                countLabel={sessionCountLabel(tradingUpcoming.length)}
                                sessions={tradingUpcoming}
                                emptyMessage={t.adminNoTradingSessionsScheduled}
                            />
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
