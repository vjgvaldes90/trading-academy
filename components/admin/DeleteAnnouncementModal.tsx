"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { useState } from "react"

type DeleteAnnouncementModalProps = {
    open: boolean
    title?: string
    submitting?: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
}

export default function DeleteAnnouncementModal({
    open,
    title = "",
    submitting: submittingProp,
    onClose,
    onConfirm,
}: DeleteAnnouncementModalProps) {
    const { t } = useLanguage()
    const [internalSubmitting, setInternalSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const submitting = submittingProp ?? internalSubmitting

    if (!open) return null

    const handleConfirm = async () => {
        setError(null)
        setInternalSubmitting(true)
        try {
            await onConfirm()
            onClose()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t.adminAnnouncementsToastDeleteError)
        } finally {
            setInternalSubmitting(false)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-announcement-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 62,
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
                    maxWidth: 440,
                    borderRadius: 16,
                    border: "1px solid rgba(248,113,113,0.35)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                }}
            >
                <div style={{ padding: "20px 22px 16px" }}>
                    <h2
                        id="delete-announcement-title"
                        style={{ margin: "0 0 12px", fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc" }}
                    >
                        {t.adminAnnouncementsDeleteTitle}
                    </h2>
                    <p style={{ margin: "0 0 8px", color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.55 }}>
                        {t.adminAnnouncementsDeleteDescription}
                    </p>
                    {title ? (
                        <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.8125rem" }}>
                            <strong style={{ color: "#e2e8f0" }}>{title}</strong>
                        </p>
                    ) : null}
                </div>
                {error ? (
                    <p style={{ margin: "0 22px 12px", color: "#f87171", fontSize: "0.875rem" }}>{error}</p>
                ) : null}
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                        padding: "12px 18px 18px",
                        borderTop: "1px solid rgba(59,130,246,0.15)",
                    }}
                >
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onClose}
                        style={{
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(148,163,184,0.35)",
                            background: "rgba(15,23,42,0.8)",
                            color: "#e2e8f0",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            cursor: submitting ? "not-allowed" : "pointer",
                        }}
                    >
                        {t.adminAnnouncementsCancel}
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleConfirm()}
                        style={{
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(248,113,113,0.5)",
                            background: submitting ? "rgba(100,100,100,0.35)" : "#b91c1c",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: "0.875rem",
                            cursor: submitting ? "not-allowed" : "pointer",
                        }}
                    >
                        {submitting ? t.adminAnnouncementsDeleting : t.adminAnnouncementsDeleteConfirm}
                    </button>
                </div>
            </div>
        </div>
    )
}
