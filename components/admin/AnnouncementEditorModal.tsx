"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useState } from "react"
import { useLanguage } from "@/context/LanguageProvider"
import {
    ANNOUNCEMENT_PRIORITIES,
    type Announcement,
    type AnnouncementPriority,
} from "@/lib/announcements"

export type AnnouncementEditorValues = {
    title: string
    message: string
    priority: AnnouncementPriority
    published: boolean
}

type AnnouncementEditorModalProps = {
    open: boolean
    mode: "create" | "edit"
    initial?: Announcement | null
    submitting?: boolean
    onClose: () => void
    onSubmit: (values: AnnouncementEditorValues) => void | Promise<void>
}

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

export default function AnnouncementEditorModal({
    open,
    mode,
    initial = null,
    submitting = false,
    onClose,
    onSubmit,
}: AnnouncementEditorModalProps) {
    const { t } = useLanguage()
    const [title, setTitle] = useState("")
    const [message, setMessage] = useState("")
    const [priority, setPriority] = useState<AnnouncementPriority>("normal")
    const [published, setPublished] = useState(true)

    useEffect(() => {
        if (!open) return
        if (mode === "edit" && initial) {
            setTitle(initial.title)
            setMessage(initial.message)
            setPriority(initial.priority)
            setPublished(initial.published)
            return
        }
        setTitle("")
        setMessage("")
        setPriority("normal")
        setPublished(true)
    }, [open, mode, initial])

    if (!open) return null

    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()
    const isValid = trimmedTitle.length > 0 && trimmedMessage.length > 0

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (!isValid || submitting) return
        void onSubmit({
            title: trimmedTitle,
            message: trimmedMessage,
            priority,
            published,
        })
    }

    const priorityLabel = (p: AnnouncementPriority) => {
        if (p === "critical") return t.adminAnnouncementsPriorityCritical
        if (p === "important") return t.adminAnnouncementsPriorityImportant
        return t.adminAnnouncementsPriorityNormal
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-editor-title"
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
                    maxWidth: 520,
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
                        id="announcement-editor-title"
                        style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}
                    >
                        {mode === "edit"
                            ? t.adminAnnouncementsEditorEditTitle
                            : t.adminAnnouncementsEditorCreateTitle}
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
                        {t.adminAnnouncementsCancel}
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "18px 18px 20px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="announcement-title" style={labelStyle}>
                            {t.adminAnnouncementsFieldTitle}
                        </label>
                        <input
                            id="announcement-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={submitting}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="announcement-message" style={labelStyle}>
                            {t.adminAnnouncementsFieldMessage}
                        </label>
                        <textarea
                            id="announcement-message"
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={submitting}
                            style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="announcement-priority" style={labelStyle}>
                            {t.adminAnnouncementsFieldPriority}
                        </label>
                        <select
                            id="announcement-priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                            disabled={submitting}
                            style={inputStyle}
                        >
                            {ANNOUNCEMENT_PRIORITIES.map((opt) => (
                                <option key={opt} value={opt}>
                                    {priorityLabel(opt)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div
                        style={{
                            marginBottom: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <span style={{ ...labelStyle, marginBottom: 0 }}>
                            {t.adminAnnouncementsFieldPublished}
                        </span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={published}
                            disabled={submitting}
                            onClick={() => setPublished((v) => !v)}
                            className={[
                                "relative h-7 w-12 rounded-full border transition",
                                published
                                    ? "border-emerald-400/40 bg-emerald-500/30"
                                    : "border-white/15 bg-white/10",
                                submitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                            ].join(" ")}
                        >
                            <span
                                className={[
                                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
                                    published ? "left-6" : "left-0.5",
                                ].join(" ")}
                            />
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
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
                            type="submit"
                            disabled={!isValid || submitting}
                            style={{
                                padding: "10px 16px",
                                borderRadius: 10,
                                border: "1px solid rgba(250,204,21,0.45)",
                                background:
                                    !isValid || submitting
                                        ? "rgba(100,100,100,0.4)"
                                        : "linear-gradient(180deg, #facc15 0%, #ca8a04 100%)",
                                color: !isValid || submitting ? "#94a3b8" : "#0f172a",
                                fontWeight: 800,
                                fontSize: "0.875rem",
                                cursor: !isValid || submitting ? "not-allowed" : "pointer",
                            }}
                        >
                            {submitting
                                ? t.adminAnnouncementsSaving
                                : mode === "edit"
                                  ? t.adminAnnouncementsSave
                                  : t.adminAnnouncementsPublish}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
