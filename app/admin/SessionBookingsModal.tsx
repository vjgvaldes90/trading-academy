"use client"

import { useCallback, useEffect, useState } from "react"

export type SessionBookingRow = {
    id: string
    user_email: string | null
    status: string | null
    created_at: string | null
}

type SessionBookingsModalProps = {
    sessionId: string
    onClose: () => void
    /** Optional: keep parent session table in sync without refetching the list. */
    onBookingCancelled?: (sessionId: string) => void
}

export default function SessionBookingsModal({
    sessionId,
    onClose,
    onBookingCancelled,
}: SessionBookingsModalProps) {
    const [bookings, setBookings] = useState<SessionBookingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadBookings = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/session/${sessionId}/bookings`, {
                cache: "no-store",
                credentials: "include",
            })
            if (res.status === 404) {
                setBookings([])
                return
            }
            const payload = (await res.json().catch(() => [])) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: unknown })?.error === "string"
                        ? (payload as { error: string }).error
                        : "Failed to load bookings"
                throw new Error(msg)
            }
            setBookings(Array.isArray(payload) ? (payload as SessionBookingRow[]) : [])
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error loading bookings"
            setError(msg)
            setBookings([])
        } finally {
            setLoading(false)
        }
    }, [sessionId])

    useEffect(() => {
        void loadBookings()
    }, [loadBookings])

    const handleCancel = async (bookingId: string) => {
        if (deletingId) return
        setDeletingId(bookingId)
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: string }
                throw new Error(body.error ?? "No se pudo cancelar")
            }
            setBookings((prev) => prev.filter((b) => b.id !== bookingId))
            onBookingCancelled?.(sessionId)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error al cancelar"
            setError(msg)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-bookings-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                background: "rgba(0,0,0,0.72)",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 640,
                    maxHeight: "90vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 16,
                    border: "1px solid rgba(59,130,246,0.3)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 40px rgba(37,99,235,0.15)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "16px 18px",
                        borderBottom: "1px solid rgba(59,130,246,0.2)",
                        flexShrink: 0,
                    }}
                >
                    <h2
                        id="session-bookings-title"
                        style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}
                    >
                        Inscritos · sesión
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "1px solid rgba(148,163,184,0.35)",
                            background: "rgba(15,23,42,0.8)",
                            color: "#e2e8f0",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        Cerrar
                    </button>
                </div>

                <div style={{ padding: "12px 18px 18px", overflowY: "auto", flex: 1 }}>
                    {loading ? (
                        <p style={{ margin: 0, color: "#9ca3af" }}>Cargando…</p>
                    ) : error ? (
                        <p style={{ margin: 0, color: "#ef4444" }}>{error}</p>
                    ) : bookings.length === 0 ? (
                        <p style={{ margin: 0, color: "#9ca3af" }}>No hay inscritos en esta sesión.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "rgba(15,23,42,0.7)" }}>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "10px 12px",
                                                color: "#cbd5e1",
                                                fontSize: "0.75rem",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.04em",
                                                borderBottom: "1px solid rgba(59,130,246,0.2)",
                                            }}
                                        >
                                            Email
                                        </th>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "10px 12px",
                                                color: "#cbd5e1",
                                                fontSize: "0.75rem",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.04em",
                                                borderBottom: "1px solid rgba(59,130,246,0.2)",
                                            }}
                                        >
                                            Estado
                                        </th>
                                        <th
                                            style={{
                                                textAlign: "right",
                                                padding: "10px 12px",
                                                color: "#cbd5e1",
                                                fontSize: "0.75rem",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.04em",
                                                borderBottom: "1px solid rgba(59,130,246,0.2)",
                                            }}
                                        >
                                            Acción
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((b) => (
                                        <tr
                                            key={b.id}
                                            style={{ borderBottom: "1px solid rgba(148,163,184,0.1)" }}
                                        >
                                            <td style={{ padding: "10px 12px", color: "#e5e7eb", fontSize: "0.9rem" }}>
                                                {b.user_email ?? "—"}
                                            </td>
                                            <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.875rem" }}>
                                                {b.status ?? "—"}
                                            </td>
                                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                                <button
                                                    type="button"
                                                    disabled={deletingId !== null}
                                                    onClick={() => void handleCancel(b.id)}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: 8,
                                                        border: "none",
                                                        background: "#b91c1c",
                                                        color: "#fff",
                                                        fontWeight: 700,
                                                        fontSize: "0.8125rem",
                                                        cursor: deletingId ? "not-allowed" : "pointer",
                                                        opacity: deletingId === b.id ? 0.7 : 1,
                                                        transition: "all 0.2s ease",
                                                    }}
                                                >
                                                    {deletingId === b.id ? "Cancelando…" : "Cancelar"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
