"use client"

import { useSession } from "@/context/SessionContext"
import {
    canShowStudentLiveJoinButton,
    getMinutesUntilSessionStart,
    getNextUpcomingSession,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"

export default function NextSessionCard() {
    const { sessions, academyAccess, userEmail } = useSession()
    const router = useRouter()
    const [now, setNow] = useState(() => new Date())
    const [joining, setJoining] = useState(false)

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000)
        return () => clearInterval(t)
    }, [])

    const nextSession = useMemo(() => getNextUpcomingSession(sessions, now), [sessions, now])

    if (!nextSession) return null

    const label = `Próxima sesión: ${sessionDisplayDay(nextSession)} ${sessionDisplayHour(nextSession)}`.trim()

    const canJoin =
        Boolean(userEmail) &&
        canShowStudentLiveJoinButton(nextSession, now, {
            hasPaid: academyAccess.canAccess,
        })

    const sessionClosed =
        academyAccess.canAccess &&
        isStudentSecureJoinWindowClosed(nextSession, now) &&
        !isStudentJoinTooEarly(nextSession, now)

    const scrollToSessions = () => {
        document.getElementById("sesiones-en-vivo")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const handleSecureJoin = async () => {
        if (!userEmail || joining) return
        setJoining(true)
        try {
            router.push(`/student/classroom/${nextSession.id}`)
        } finally {
            setJoining(false)
        }
    }

    const secondaryButtonStyle: CSSProperties = {
        width: "100%",
        padding: "0.75rem 1.25rem",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "0.9375rem",
        boxShadow: "0 10px 24px rgba(59,130,246,0.3)",
        transition: "all 0.2s ease",
    }

    return (
        <section aria-label="Próxima sesión">
            <div
                style={{
                    borderRadius: 12,
                    padding: "var(--ds-4)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "0 20px 30px -20px rgba(59,130,246,0.25)",
                }}
            >
                <p
                    style={{
                        margin: "0 0 var(--ds-3)",
                        color: "#f8fafc",
                        fontSize: "1.0625rem",
                        fontWeight: 700,
                        lineHeight: 1.35,
                    }}
                >
                    {label}
                </p>
                <p
                    style={{
                        margin: "0 0 var(--ds-3)",
                        color: "#94a3b8",
                        fontSize: "0.82rem",
                        textAlign: "center",
                    }}
                >
                    Tu acceso se valida automaticamente para que entres sin complicaciones.
                </p>
                {canJoin ? (
                    <button
                        type="button"
                        disabled={joining}
                        onClick={() => void handleSecureJoin()}
                        style={{
                            display: "flex",
                            width: "100%",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "0.75rem 1.25rem",
                            borderRadius: 12,
                            border: "none",
                            cursor: joining ? "wait" : "pointer",
                            opacity: joining ? 0.85 : 1,
                            background: "linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.9375rem",
                            boxShadow: "0 10px 24px rgba(220,38,38,0.35)",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {joining ? "Abriendo..." : "Join Live Session"}
                    </button>
                ) : !academyAccess.canAccess ? (
                    <div style={{ display: "grid", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#fcd34d", textAlign: "center" }}>
                            Acceso no disponible
                        </p>
                        <Link
                            href="/pricing"
                            style={{
                                textAlign: "center",
                                fontSize: "0.8125rem",
                                fontWeight: 700,
                                color: "#60a5fa",
                            }}
                        >
                            Obtener acceso →
                        </Link>
                    </div>
                ) : sessionClosed ? (
                    <p style={{ margin: 0, fontSize: "0.8125rem", color: "#94a3b8", textAlign: "center" }}>
                        Sesión cerrada
                    </p>
                ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                        <button type="button" onClick={scrollToSessions} style={secondaryButtonStyle}>
                            Ver sesiones
                        </button>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                            {isStudentJoinTooEarly(nextSession, now)
                                ? "Disponible 10 minutos antes"
                                : getMinutesUntilSessionStart(nextSession, now) === null
                                  ? "Horario no disponible"
                                  : "Live Session"}
                        </p>
                    </div>
                )}
            </div>
        </section>
    )
}
