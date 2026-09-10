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
import { useMemo, useState } from "react"

function SlotRow({ session }: { session: DbSession }) {
    const { academyAccess, userEmail } = useSession()
    const { t } = useLanguage()
    const router = useRouter()
    const now = new Date()
    const canAccess = academyAccess.canAccess
    const [joining, setJoining] = useState(false)

    const label = `${sessionDisplayDay(session)} · ${sessionDisplayHour(session) || "—"}`

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

    return (
        <div className="flex flex-col gap-[var(--ds-2)] rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#111827] to-[#0B0F1A] p-[var(--ds-3)] shadow-xl shadow-blue-500/10 transition-all duration-200 hover:scale-[1.02]">
            <div
                style={{
                    fontWeight: 600,
                    color: "var(--ds-text)",
                    fontSize: "0.9375rem",
                }}
            >
                {label}
            </div>
            <p
                style={{
                    margin: 0,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: session.session_type === "theory" ? "#c4b5fd" : "#7dd3fc",
                }}
            >
                {session.session_type === "theory"
                    ? t.sessionTypeTheoryClass
                    : t.sessionTypeTradingSession}
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#22c55e" }}>{t.available}</p>
            {!canAccess ? (
                <>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#fcd34d" }}>{t.accessNotAvailable}</p>
                    <Link
                        href="/pricing"
                        style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-accent)" }}
                    >
                        {t.getAccess}
                    </Link>
                </>
            ) : sessionClosed ? (
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
                    {t.sessionClosed}
                </p>
            ) : mayOpenLiveJoin ? (
                <button
                    type="button"
                    disabled={joining}
                    onClick={() => void handleSecureJoin()}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
                >
                    {joining ? t.opening : t.joinLiveSession}
                </button>
            ) : isStudentJoinTooEarly(session, now) ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
                    {t.availableTenMinBefore}
                </p>
            ) : (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>{t.liveSession}</p>
            )}
        </div>
    )
}

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
            <div className="space-y-3 p-4">
                {sessions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
                ) : (
                    sessions.map((s) => <SlotRow key={s.id} session={s} />)
                )}
            </div>
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

    const sessionCountLabel = (n: number) =>
        n === 1 ? t.studentLiveSessionCountOne : t.studentLiveSessionCountMany.replace("{count}", String(n))

    return (
        <section id="sesiones-en-vivo" aria-labelledby="sesiones-en-vivo-title" className="space-y-4">
            <h2 id="sesiones-en-vivo-title" className="sr-only">
                {t.liveSessionsTitle}
            </h2>

            {!sessions?.length ? (
                <p className="text-center text-sm text-slate-500">{t.noSessionsAvailableYet}</p>
            ) : showTheoryColumn ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <SessionCategoryBlock
                        title={t.sessionTypeTheoryClass}
                        countLabel={sessionCountLabel(theoryUpcoming.length)}
                        sessions={theoryUpcoming}
                        emptyMessage={t.studentNoTheoryClassesScheduled}
                    />
                    <SessionCategoryBlock
                        title={t.sessionTypeTradingSession}
                        countLabel={sessionCountLabel(tradingUpcoming.length)}
                        sessions={tradingUpcoming}
                        emptyMessage={t.studentNoTradingSessionsScheduled}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <SessionCategoryBlock
                        title={t.sessionTypeTradingSession}
                        countLabel={sessionCountLabel(tradingUpcoming.length)}
                        sessions={tradingUpcoming}
                        emptyMessage={t.studentNoTradingSessionsScheduled}
                    />
                </div>
            )}
        </section>
    )
}
