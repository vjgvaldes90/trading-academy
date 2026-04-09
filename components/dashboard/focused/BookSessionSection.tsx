"use client"

import type { TabKey } from "@/context/SessionContext"
import { useSession } from "@/context/SessionContext"
import { useBooking } from "@/hooks/useBooking"
import { DbSession, getSessionMeta, sessionDisplayDay, sessionDisplayHour } from "@/lib/sessions"
import BookingInsertTestButton from "@/components/debug/BookingInsertTestButton"
import Link from "next/link"
import { useState } from "react"

function SlotRow({ session }: { session: DbSession }) {
    const {
        bookingAccess,
        userEmail,
        myBookings,
        cancelMyBooking,
        setSessions,
        applyReserveSuccess,
    } = useSession()
    const canBook = bookingAccess.canBook
    const myBooking =
        userEmail != null
            ? myBookings.find((b) => b.session_id === session.id && b.email === userEmail)
            : undefined
    const isMine = Boolean(myBooking)
    const meta = getSessionMeta(session)
    const isFull = meta.available <= 0
    const lockedOutForReserve = isFull || !canBook || isMine

    const { isLoading, bookSession } = useBooking(session, lockedOutForReserve, {
        userEmail,
        setSessions,
        applyReserveSuccess,
    })

    const [cancelLoading, setCancelLoading] = useState(false)
    const [cancelError, setCancelError] = useState<string | null>(null)

    const label = `${sessionDisplayDay(session)} · ${sessionDisplayHour(session) || "—"}`

    const reserveDisabled = lockedOutForReserve || isLoading

    let reserveLabel = "Reservar"
    if (isLoading) reserveLabel = "Reservando…"
    else if (!canBook) reserveLabel = "Sin acceso"
    else if (isFull) reserveLabel = "Lleno"

    const handleCancel = async () => {
        if (cancelLoading || !myBooking?.id) return
        setCancelError(null)
        setCancelLoading(true)
        try {
            const r = await cancelMyBooking(myBooking.id, session.id)
            if (!r.ok) setCancelError(r.error ?? "No se pudo cancelar")
        } finally {
            setCancelLoading(false)
        }
    }

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
            {isMine ? (
                <button
                    type="button"
                    disabled={cancelLoading}
                    onClick={() => void handleCancel()}
                    style={{
                        width: "100%",
                        padding: "0.65rem 1rem",
                        borderRadius: 12,
                        border: "1px solid var(--ds-border-strong)",
                        cursor: cancelLoading ? "not-allowed" : "pointer",
                        opacity: cancelLoading ? 0.7 : 1,
                        background: "var(--ds-surface-hover)",
                        color: "var(--ds-text)",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                    }}
                >
                    {cancelLoading ? "Cancelando…" : "Cancelar"}
                </button>
            ) : null}
            {isMine && cancelError ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#b91c1c" }} role="alert">
                    {cancelError}
                </p>
            ) : null}
            {!isMine ? (
                <button
                    type="button"
                    disabled={reserveDisabled}
                    onClick={() => void bookSession()}
                    style={{
                        width: "100%",
                        padding: "0.65rem 1rem",
                        borderRadius: 12,
                        border: "none",
                        cursor: reserveDisabled ? "not-allowed" : "pointer",
                        opacity: reserveDisabled ? 0.7 : 1,
                        background: isFull
                            ? "#9ca3af"
                            : "linear-gradient(135deg, var(--ds-accent), #2563eb)",
                        color: isFull ? "var(--ds-text)" : "#fff",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                    }}
                >
                    {reserveLabel}
                </button>
            ) : null}
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ds-text-muted)" }}>
                {meta.available} / {session.max_slots ?? 10} disponibles
            </p>
            {!canBook ? (
                <Link
                    href="/pricing"
                    style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-accent)" }}
                >
                    Obtener acceso →
                </Link>
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
    const { activeTab, setActiveTab, filteredSessions, userEmail } = useSession()
    const testSessionId = filteredSessions[0]?.id ?? null

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
                    No hay sesiones disponibles
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
            <BookingInsertTestButton sessionId={testSessionId} email={userEmail} />
        </section>
    )
}
