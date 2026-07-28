"use client"

import type { TabKey } from "@/context/SessionContext"
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
import { useState } from "react"

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

export default function BookSessionSection() {
    const { activeTab, setActiveTab, filteredSessions, sessions } = useSession()
    const { t } = useLanguage()

    const tabLabels: { key: TabKey; label: string }[] = [
        { key: "today", label: t.tabToday },
        { key: "thisWeek", label: t.tabThisWeek },
        { key: "nextWeek", label: t.tabNextWeek },
    ]

    return (
        <section id="sesiones-en-vivo" aria-labelledby="sesiones-en-vivo-title">
            <h2
                id="sesiones-en-vivo-title"
                style={{
                    margin: "0 0 var(--ds-3)",
                    color: "#93c5fd",
                    textShadow: "0 0 10px rgba(59,130,246,0.5)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                }}
            >
                {t.liveSessionsTitle}
            </h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--ds-2)",
                    marginBottom: "var(--ds-4)",
                }}
            >
                {tabLabels.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        style={{
                            padding: "0.5rem 1rem",
                            borderRadius: 12,
                            border: `1px solid ${activeTab === key ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.2)"}`,
                            background:
                                activeTab === key
                                    ? "linear-gradient(90deg, rgba(59,130,246,0.2), rgba(29,78,216,0.2))"
                                    : "rgba(17,24,39,0.8)",
                            color: "#f8fafc",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {!sessions?.length ? (
                <p style={{ color: "var(--ds-text-muted)", margin: 0, fontSize: "0.875rem", textAlign: "center" }}>
                    {t.noSessionsAvailableYet}
                </p>
            ) : filteredSessions.length === 0 ? (
                <p style={{ color: "var(--ds-text-muted)", margin: 0, fontSize: "0.875rem" }}>
                    {t.noSessionsInRange}
                </p>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                        gap: "var(--ds-3)",
                    }}
                >
                    {filteredSessions.map((s) => (
                        <SlotRow key={s.id} session={s} />
                    ))}
                </div>
            )}
        </section>
    )
}
