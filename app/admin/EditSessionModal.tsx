"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useState } from "react"
import { useLanguage } from "@/context/LanguageProvider"

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
    date?: string | null
}

type EditSessionModalProps = {
    open: boolean
    session: EditSessionTarget | null
    onClose: () => void
    onSuccess: () => void | Promise<void>
}

export default function EditSessionModal({ open, session, onClose, onSuccess }: EditSessionModalProps) {
    const { t } = useLanguage()
    const [time, setTime] = useState(() => toTimeInputValue(session?.time ?? null))
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open || !session) return
        setTime(toTimeInputValue(session.time))
        setSubmitError(null)
        setSubmitting(false)
    }, [open, session])

    if (!open || !session) return null

    const dateLabel = session.date?.trim() ? session.date : "—"

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        if (!time.trim()) {
            setSubmitError(t.createSessionTimeRequired)
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/admin/sessions/${session.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    time: time.trim(),
                }),
                cache: "no-store",
            })
            const payload = (await res.json().catch(() => ({}))) as { error?: string; details?: string }
            if (!res.ok) {
                const msg =
                    typeof payload.error === "string" ? payload.error : t.updateSessionFailed
                const detail =
                    typeof payload.details === "string" && payload.details.trim() !== ""
                        ? `${msg}: ${payload.details}`
                        : msg
                throw new Error(detail)
            }
            await Promise.resolve(onSuccess())
            onClose()
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : t.saveError)
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
                        {t.editSessionTitle}
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
                        {t.close}
                    </button>
                </div>

                <div style={{ padding: "12px 18px 0", color: "#64748b", fontSize: "0.8125rem" }}>
                    {t.editSessionDateReadonly}{" "}
                    <span style={{ color: "#e2e8f0" }}>{dateLabel}</span>
                </div>
                <p style={{ margin: "8px 18px 0", color: "#64748b", fontSize: "0.78rem", lineHeight: 1.45 }}>
                    {t.editSessionZoomNote}
                </p>

                <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "14px 18px 20px" }}>
                    <div style={{ marginBottom: 18 }}>
                        <label htmlFor="edit-session-time" style={labelStyle}>
                            {t.timeLabel}
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
                        {submitting ? t.saving : t.saveChanges}
                    </button>
                </form>
            </div>
        </div>
    )
}
