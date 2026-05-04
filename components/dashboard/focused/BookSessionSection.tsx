"use client"

import type { TabKey } from "@/context/SessionContext"
import { useSession } from "@/context/SessionContext"
import { useBooking } from "@/hooks/useBooking"
import { fetchSecureStudentJoinUrl } from "@/lib/secureJoinClient"
import {
    canShowStudentLiveJoinButton,
    DbSession,
    getSessionAvailableSeats,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"
import BookingInsertTestButton from "@/components/debug/BookingInsertTestButton"
import Link from "next/link"
import { useState } from "react"

function SlotRow({ session }: { session: DbSession }) {
    const { bookingAccess, userEmail, myBookings, cancelMyBooking } = useSession()
    const now = new Date()
    const canBook = bookingAccess.canBook
    const myBooking =
        userEmail != null
            ? myBookings.find((b) => b.session_id === session.id && b.email === userEmail)
            : undefined
    const isMine = Boolean(myBooking)
    const available = getSessionAvailableSeats(session)
    const isFull = available === 0
    const lockedOutForReserve = isFull || !canBook || isMine || !userEmail

    const { isLoading, bookSession } = useBooking()

    const [cancelLoading, setCancelLoading] = useState(false)
    const [cancelError, setCancelError] = useState<string | null>(null)
    const [joining, setJoining] = useState(false)

    const label = `${sessionDisplayDay(session)} · ${sessionDisplayHour(session) || "—"}`

    const reserveDisabled = lockedOutForReserve || isLoading
    const sessionFullForJoin = available === 0 && !isMine
    const mayOpenLiveJoin = canShowStudentLiveJoinButton(session, now, {
        hasPaid: canBook,
        hasReservation: isMine,
    })

    let reserveLabel = "Reservar"
    if (isLoading) reserveLabel = "Reservando…"
    else if (!canBook) reserveLabel = "Acceso no disponible"
    else if (isFull) reserveLabel = "Full"

    const handleSecureJoin = async () => {
        if (!userEmail || joining) return
        setJoining(true)
        try {
            const r = await fetchSecureStudentJoinUrl(session.id, userEmail)
            if (r.ok) {
                window.open(r.join_url, "_blank", "noopener,noreferrer")
            } else {
                console.warn("[BookSessionSection] join denied", r.code, r.message)
            }
        } finally {
            setJoining(false)
        }
    }

    const sessionClosed =
        canBook &&
        isMine &&
        isStudentSecureJoinWindowClosed(session, now) &&
        !isStudentJoinTooEarly(session, now)

    const handleCancel = async () => {
        if (cancelLoading || !myBooking?.id) return
        setCancelError(null)
        setCancelLoading(true)
        try {
            const r = await cancelMyBooking(myBooking.id, session.id)
            if (!r.ok) setCancelError(r.error ?? "No se pudo cancelar")
        } catch (err) {
            console.error(err)
        } finally {
            setCancelLoading(false)
        }
    }

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
            {isMine ? (
                <button
                    type="button"
                    disabled={cancelLoading}
                    onClick={() => void handleCancel()}
                    className="w-full rounded-xl border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm font-bold text-gray-100 transition-all duration-200 hover:bg-gray-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
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
                    onClick={() =>
                        void bookSession(session.id, userEmail ?? "").catch(() => {})
                    }
                    className={[
                        "w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95",
                        isFull || reserveDisabled
                            ? "cursor-not-allowed bg-gray-800 text-gray-500"
                            : "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-600",
                    ].join(" ")}
                >
                    {reserveLabel}
                </button>
            ) : null}
            {!canBook ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#fcd34d" }}>Acceso no disponible</p>
            ) : sessionFullForJoin ? (
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#f87171" }}>Sesión llena</p>
            ) : !isMine ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>Debes reservar esta sesión</p>
            ) : sessionClosed ? (
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>Sesión cerrada</p>
            ) : mayOpenLiveJoin ? (
                <button
                    type="button"
                    disabled={joining}
                    onClick={() => void handleSecureJoin()}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
                >
                    {joining ? "Abriendo…" : "Unirse a la sesión en vivo"}
                </button>
            ) : isStudentJoinTooEarly(session, now) ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>Disponible 10 minutos antes</p>
            ) : null}
            <p
                style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: available === 0 ? "#ef4444" : available <= 5 ? "#facc15" : "#22c55e",
                }}
            >
                {available === 0 ? "Full" : `${available} cupos disponibles`}
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
    const {
        activeTab,
        setActiveTab,
        filteredSessions,
        sessions,
        sessionBookingError,
        sessionBookingSuccess,
    } = useSession()

    return (
        <section id="reservar-sesion" aria-labelledby="reservar-sesion-title">
            <h2
                id="reservar-sesion-title"
                style={{
                    margin: "0 0 var(--ds-3)",
                    color: "#93c5fd",
                    textShadow: "0 0 10px rgba(59,130,246,0.5)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                }}
            >
                Reservar Sesión
            </h2>

            {sessionBookingError ? (
                <p
                    role="alert"
                    style={{
                        margin: "0 0 var(--ds-3)",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#b91c1c",
                    }}
                >
                    {sessionBookingError}
                </p>
            ) : null}
            {sessionBookingSuccess ? (
                <p
                    style={{
                        margin: "0 0 var(--ds-3)",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#15803d",
                    }}
                >
                    {sessionBookingSuccess}
                </p>
            ) : null}

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
                    No tienes sesiones disponibles aún
                </p>
            ) : filteredSessions.length === 0 ? (
                <p style={{ color: "var(--ds-text-muted)", margin: 0, fontSize: "0.875rem" }}>
                    No hay sesiones en este rango.
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
            <BookingInsertTestButton />
        </section>
    )
}
