"use client"

import { useSession } from "@/context/SessionContext"
import { getNextBookedSession, sessionDisplayDay, sessionDisplayHour } from "@/lib/sessions"
import { useEffect, useMemo, useState } from "react"

export default function NextSessionCard() {
    const { sessions } = useSession()
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000)
        return () => clearInterval(t)
    }, [])

    const nextBooked = useMemo(() => getNextBookedSession(sessions, now), [sessions, now])

    if (!nextBooked) return null

    const label = `Próxima sesión: ${sessionDisplayDay(nextBooked)} ${sessionDisplayHour(nextBooked)}`.trim()

    const joinHref = nextBooked.link?.trim() ?? ""
    const hasJoinLink = joinHref.length > 0

    const scrollToBooking = () => {
        document.getElementById("reservar-sesion")?.scrollIntoView({ behavior: "smooth", block: "start" })
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
                {hasJoinLink ? (
                    <a
                        href={joinHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            width: "100%",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "0.75rem 1.25rem",
                            borderRadius: 12,
                            background: "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.9375rem",
                            textDecoration: "none",
                            boxShadow: "0 10px 24px rgba(59,130,246,0.3)",
                            transition: "all 0.2s ease",
                        }}
                    >
                        Unirse
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={scrollToBooking}
                        style={{
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
                        }}
                    >
                        Ver horarios
                    </button>
                )}
            </div>
        </section>
    )
}
