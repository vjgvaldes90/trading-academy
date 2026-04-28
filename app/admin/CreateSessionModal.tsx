"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useState } from "react"
import { DEFAULT_MEET_LINK } from "@/lib/defaultMeetLink"

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

type CreateSessionModalProps = {
    open: boolean
    onClose: () => void
    /** Called after the session is created successfully (e.g. refetch list). */
    onSuccess: () => void | Promise<void>
}

export default function CreateSessionModal({ open, onClose, onSuccess }: CreateSessionModalProps) {
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")
    const [capacity, setCapacity] = useState("")
    const [link, setLink] = useState(DEFAULT_MEET_LINK)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setDate("")
        setTime("")
        setCapacity("")
        setLink(DEFAULT_MEET_LINK)
        setSubmitError(null)
        setSubmitting(false)
    }, [open])

    if (!open) return null

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        if (!date.trim()) {
            setSubmitError("La fecha es obligatoria.")
            return
        }
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

        setSubmitting(true)
        try {
            const linkPayload = link.trim() !== "" ? link.trim() : DEFAULT_MEET_LINK
            const res = await fetch("/api/admin/sessions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: date.trim(),
                    time: time.trim(),
                    capacity: cap,
                    link: linkPayload,
                }),
                cache: "no-store",
            })
            const payload = (await res.json().catch(() => ({}))) as { error?: string; details?: string }
            if (!res.ok) {
                const msg =
                    typeof payload.error === "string"
                        ? payload.error
                        : "No se pudo crear la sesión"
                const detail =
                    typeof payload.details === "string" && payload.details.trim() !== ""
                        ? `${msg}: ${payload.details}`
                        : msg
                throw new Error(detail)
            }
            await Promise.resolve(onSuccess())
            onClose()
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : "Error al crear la sesión")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-session-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 60,
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
                        id="create-session-title"
                        style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}
                    >
                        Nueva sesión
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

                <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "18px 18px 20px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="create-session-date" style={labelStyle}>
                            Fecha
                        </label>
                        <input
                            id="create-session-date"
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={submitting}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="create-session-time" style={labelStyle}>
                            Hora
                        </label>
                        <input
                            id="create-session-time"
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            disabled={submitting}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 18 }}>
                        <label htmlFor="create-session-link" style={labelStyle}>
                            Link de la sesión (Meet / Zoom)
                        </label>
                        <input
                            id="create-session-link"
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            disabled={submitting}
                            placeholder="https://meet.google.com/xxx-xxx"
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 18 }}>
                        <label htmlFor="create-session-capacity" style={labelStyle}>
                            Cupo (plazas)
                        </label>
                        <input
                            id="create-session-capacity"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            required
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            disabled={submitting}
                            placeholder="Ej. 12"
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
                        {submitting ? "Creando…" : "Crear sesión"}
                    </button>
                </form>
            </div>
        </div>
    )
}
