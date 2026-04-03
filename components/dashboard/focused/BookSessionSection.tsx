"use client"

import type { TabKey } from "@/context/SessionContext"
import { useSession } from "@/context/SessionContext"
import { useBooking } from "@/hooks/useBooking"
import { DbSession, formatTimeLabel, getSessionMeta, weekdayLabel } from "@/lib/sessions"
import Link from "next/link"
import { useCallback } from "react"

function SlotRow({ session }: { session: DbSession }) {
    const { bookingAccess } = useSession()
    const canBook = bookingAccess.canBook
    const bookedByUser = Boolean(session.isBookedByUser)
    const meta = getSessionMeta(session)
    const slotFull = meta.isFull
    const lockedOut = slotFull || !canBook || bookedByUser

    const { isLoading, status, message, bookSession } = useBooking(session, lockedOut, {
        onReserved: useCallback(() => {
            console.log("[dashboard] booking confirmed", { sessionId: session.id })
        }, [session.id]),
    })

    const label = `${weekdayLabel(session)} - ${formatTimeLabel(session) || "—"}`

    const retryable = status === "error" && !isLoading && !slotFull && canBook && !bookedByUser
    const ctaDisabled = (lockedOut && !retryable) || isLoading

    let buttonLabel = "Reservar"
    if (bookedByUser) buttonLabel = "Reservado"
    else if (isLoading) buttonLabel = "Reservando…"
    else if (!canBook) buttonLabel = "Sin acceso"
    else if (slotFull) buttonLabel = "Lleno"
    else if (retryable) buttonLabel = "Reintentar"

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--ds-2)",
                padding: "var(--ds-3)",
                borderRadius: 12,
                border: "1px solid var(--ds-border)",
                background: "var(--ds-surface)",
                boxShadow: "var(--ds-shadow-card)",
            }}
        >
            <div
                style={{
                    fontWeight: 600,
                    color: "var(--ds-text)",
                    fontSize: "0.9375rem",
                }}
            >
                {label}
            </div>
            <button
                type="button"
                disabled={ctaDisabled}
                onClick={() => {
                    console.log("[dashboard] reserve click", { sessionId: session.id, label })
                    void bookSession()
                }}
                style={{
                    width: "100%",
                    padding: "0.65rem 1rem",
                    borderRadius: 12,
                    border: "none",
                    cursor: ctaDisabled ? "not-allowed" : "pointer",
                    opacity: ctaDisabled ? 0.7 : 1,
                    background: bookedByUser
                        ? "var(--ds-accent-muted)"
                        : "linear-gradient(135deg, var(--ds-accent), #2563eb)",
                    color: bookedByUser ? "var(--ds-text)" : "#fff",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                }}
            >
                {buttonLabel}
            </button>
            {!canBook ? (
                <Link
                    href="/pricing"
                    style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-accent)" }}
                >
                    Obtener acceso →
                </Link>
            ) : null}
            {message && canBook && !bookedByUser ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ds-danger)" }}>{message}</p>
            ) : null}
        </div>
    )
}

const TAB_LABELS: { key: TabKey; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "thisWeek", label: "Esta semana" },
    { key: "nextWeek", label: "Próxima semana" },
]

export default function BookSessionSection() {
    const { activeTab, setActiveTab, filteredSessions } = useSession()

    return (
        <section id="reservar-sesion" aria-labelledby="reservar-sesion-title">
            <h2
                id="reservar-sesion-title"
                style={{
                    margin: "0 0 var(--ds-3)",
                    color: "var(--ds-text)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                }}
            >
                Reservar Sesión
            </h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--ds-2)",
                    marginBottom: "var(--ds-4)",
                }}
            >
                {TAB_LABELS.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        style={{
                            padding: "0.5rem 1rem",
                            borderRadius: 12,
                            border: `1px solid ${activeTab === key ? "var(--ds-accent)" : "var(--ds-border)"}`,
                            background: activeTab === key ? "var(--ds-accent-muted)" : "var(--ds-surface)",
                            color: "var(--ds-text)",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {filteredSessions.length === 0 ? (
                <p style={{ color: "var(--ds-text-muted)", margin: 0, fontSize: "0.875rem" }}>
                    No hay horarios en este rango.
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
