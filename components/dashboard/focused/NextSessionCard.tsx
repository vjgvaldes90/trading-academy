"use client"

import { useSession } from "@/context/SessionContext"
import { formatTimeLabel, getNextBookedSession, weekdayLabel } from "@/lib/sessions"
import { useEffect, useMemo, useState } from "react"

export default function NextSessionCard() {
    const { sessions } = useSession()
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000)
        return () => clearInterval(t)
    }, [])

    const nextBooked = useMemo(() => getNextBookedSession(sessions, now), [sessions, now])

    const label = nextBooked
        ? `Próxima sesión: ${weekdayLabel(nextBooked)} ${formatTimeLabel(nextBooked) || ""}`.trim()
        : null

    const joinHref = nextBooked?.link?.trim() ?? ""
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
                    background: "var(--ds-surface-hover)",
                    border: "1px solid var(--ds-border-strong)",
                    boxShadow: "var(--ds-shadow-sm)",
                }}
            >
                {nextBooked ? (
                    <>
                        <p
                            style={{
                                margin: "0 0 var(--ds-3)",
                                color: "var(--ds-text)",
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
                                    background: "linear-gradient(135deg, var(--ds-accent), #2563eb)",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "0.9375rem",
                                    textDecoration: "none",
                                    boxShadow: "var(--ds-shadow-card)",
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
                                    background: "linear-gradient(135deg, var(--ds-accent), #2563eb)",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "0.9375rem",
                                    boxShadow: "var(--ds-shadow-card)",
                                }}
                            >
                                Ver horarios
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <p
                            style={{
                                margin: "0 0 var(--ds-3)",
                                color: "var(--ds-text-muted)",
                                fontSize: "0.9375rem",
                                lineHeight: 1.5,
                            }}
                        >
                            No tienes sesiones reservadas
                        </p>
                        <button
                            type="button"
                            onClick={scrollToBooking}
                            style={{
                                width: "100%",
                                padding: "0.75rem 1.25rem",
                                borderRadius: 12,
                                border: "none",
                                cursor: "pointer",
                                background: "linear-gradient(135deg, var(--ds-accent), #2563eb)",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.9375rem",
                                boxShadow: "var(--ds-shadow-card)",
                            }}
                        >
                            Reservar sesión
                        </button>
                    </>
                )}
            </div>
        </section>
    )
}
