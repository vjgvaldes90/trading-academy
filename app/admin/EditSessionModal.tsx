"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useState } from "react"

const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(59,130,246,0.25)",
    background: "rgba(15,23,42,0.85)",
    color: "#f8fafc",
    fontSize: "0.9375rem",
    outline: "none",
}

const labelStyle: CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: "0.02em",
}

/** Normalize DB time string for `<input type="time" />` (HH:mm). */
function toTimeInputValue(raw: string | null): string {
    if (!raw || typeof raw !== "string") return ""
    const t = raw.trim()
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(t)
    if (!m) return ""
    const h = Number(m[1])
    const min = m[2]
    if (!Number.isFinite(h) || h < 0 || h > 23) return ""
    return `${String(h).padStart(2, "0")}:${min}`
}

export type EditSessionTarget = {
    id: string
    time: string | null
    capacity: number | null
    /** Current confirmed bookings; used to block capacity below booked. */
    booked?: number | null
    date?: string | null
}

type EditSessionModalProps = {
    open: boolean
    session: EditSessionTarget | null
    onClose: () => void
    onSuccess: () => void | Promise<void>
}

export default function EditSessionModal({ open, session, onClose, onSuccess }: EditSessionModalProps) {
    const [time, setTime] = useState(() => toTimeInputValue(session?.time ?? null))
    const [capacity, setCapacity] = useState(() =>
        typeof session?.capacity === "number" && Number.isFinite(session.capacity)
            ? String(session.capacity)
            : ""
    )
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open || !session) return
        setTime(toTimeInputValue(session.time))
        setCapacity(
            typeof session.capacity === "number" && Number.isFinite(session.capacity)
                ? String(session.capacity)
                : ""
        )
        setSubmitError(null)
        setSubmitting(false)
    }, [open, session?.id, session?.time, session?.capacity, session?.booked])

    if (!open || !session) return null

    const dateLabel = session.date?.trim() ? session.date : "—"

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        if (!time.trim()) {
            setSubmitError("La hora es obligatoria.")
            return
        }
        const cap = Number.parseInt(capacity.trim(), 10)
        if (capacity.trim() === "" || !Number.isFinite(cap) || !Number.isInteger(cap)) {
            setSubmitError("El cupo debe ser un número entero.")
            return
        }
        if (cap <= 0) {
            setSubmitError("El cupo debe ser mayor que 0.")
            return
        }

        const booked = typeof session.booked === "number" && Number.isFinite(session.booked) ? session.booked : 0
        if (cap < booked) {
            setSubmitError(
                `El cupo no puede ser menor que las reservas confirmadas (${booked}). Reduce reservas o elige un cupo mayor o igual.`
            )
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/admin/sessions/${session.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    time: time.trim(),
                    capacity: cap,
                }),
                cache: "no-store",
            })
            const payload = (await res.json().catch(() => ({}))) as { error?: string; details?: string }
            if (!res.ok) {
                const msg =
                    typeof payload.error === "string" ? payload.error : "No se pudo actualizar la sesión"
                const detail =
                    typeof payload.details === "string" && payload.details.trim() !== ""
                        ? `${msg}: ${payload.details}`
                        : msg
                throw new Error(detail)
            }
            await Promise.resolve(onSuccess())
            onClose()
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : "Error al guardar")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 61,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                background: "rgba(0,0,0,0.72)",
            }}
            onClick={submitting ? undefined : onClose}
        >
            <div
                onClick={(ev) => ev.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 420,
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
                    }}
                >
                    <h2
                        id="edit-session-title"
                        style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}
                    >
                        Editar sesión
                    </h2>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onClose}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "1px solid rgba(148,163,184,0.35)",
                            background: "rgba(15,23,42,0.8)",
                            color: "#e2e8f0",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                            cursor: submitting ? "not-allowed" : "pointer",
                            opacity: submitting ? 0.6 : 1,
                        }}
                    >
                        Cerrar
                    </button>
                </div>

                <div style={{ padding: "12px 18px 0", color: "#64748b", fontSize: "0.8125rem" }}>
                    Fecha (solo lectura): <span style={{ color: "#e2e8f0" }}>{dateLabel}</span>
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "14px 18px 20px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="edit-session-time" style={labelStyle}>
                            Hora
                        </label>
                        <input
                            id="edit-session-time"
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            disabled={submitting}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 18 }}>
                        <label htmlFor="edit-session-capacity" style={labelStyle}>
                            Cupo (plazas)
                        </label>
                        {typeof session.booked === "number" && session.booked >= 0 ? (
                            <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>
                                Reservas confirmadas:{" "}
                                <strong style={{ color: "#cbd5e1" }}>{session.booked}</strong> — el cupo no puede ser
                                inferior.
                            </p>
                        ) : null}
                        <input
                            id="edit-session-capacity"
                            type="number"
                            inputMode="numeric"
                            min={Math.max(
                                1,
                                typeof session.booked === "number" && Number.isFinite(session.booked)
                                    ? session.booked
                                    : 1
                            )}
                            step={1}
                            required
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            disabled={submitting}
                            style={inputStyle}
                        />
                    </div>

                    {submitError ? (
                        <p style={{ margin: "0 0 14px", color: "#f87171", fontSize: "0.875rem" }}>
                            {submitError}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(250,204,21,0.45)",
                            background: submitting
                                ? "rgba(100,100,100,0.4)"
                                : "linear-gradient(180deg, #facc15 0%, #ca8a04 100%)",
                            color: submitting ? "#94a3b8" : "#0f172a",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            cursor: submitting ? "not-allowed" : "pointer",
                            boxShadow: submitting ? "none" : "0 4px 14px rgba(250,204,21,0.25)",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {submitting ? "Guardando…" : "Guardar cambios"}
                    </button>
                </form>
            </div>
        </div>
    )
}
