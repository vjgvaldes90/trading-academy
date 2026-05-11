"use client"

import type { CSSProperties } from "react"
import { FormEvent, useCallback, useEffect, useState } from "react"

type LessonRow = {
    id: string
    title: string
    description: string | null
    video_url: string
    created_at: string
}

function formatCreatedAt(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

export default function AdminClasses() {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [videoUrl, setVideoUrl] = useState("")
    const [busy, setBusy] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [lessons, setLessons] = useState<LessonRow[]>([])
    const [listLoading, setListLoading] = useState(true)
    const [listError, setListError] = useState<string | null>(null)

    const loadLessons = useCallback(async () => {
        setListLoading(true)
        setListError(null)
        try {
            const res = await fetch("/api/lessons", { cache: "no-store", credentials: "include" })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: string })?.error === "string"
                        ? (payload as { error: string }).error
                        : "Failed to load classes"
                throw new Error(msg)
            }
            setLessons(Array.isArray(payload) ? (payload as LessonRow[]) : [])
        } catch (e) {
            setListError(e instanceof Error ? e.message : "Failed to load classes")
            setLessons([])
        } finally {
            setListLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadLessons()
    }, [loadLessons])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError(null)
        setSuccess(null)
        setBusy(true)
        try {
            const res = await fetch("/api/admin/lessons", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    videoUrl: videoUrl.trim(),
                }),
            })
            const payload = (await res.json().catch(() => ({}))) as { error?: string }
            if (!res.ok) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : "Could not add class"
                )
            }
            setSuccess("Class added successfully.")
            setTitle("")
            setDescription("")
            setVideoUrl("")
            await loadLessons()
        } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not add class")
        } finally {
            setBusy(false)
        }
    }

    const inputStyle: CSSProperties = {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(15,23,42,0.85)",
        color: "#e5e7eb",
        fontSize: "0.9rem",
        outline: "none",
    }

    const labelStyle: CSSProperties = {
        display: "block",
        fontSize: "0.8rem",
        fontWeight: 700,
        color: "#cbd5e1",
        marginBottom: 6,
    }

    return (
        <div className="space-y-6 text-[#e5e7eb]">
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <p style={{ margin: "0 0 18px", color: "#9ca3af", fontSize: "0.95rem" }}>
                    Publish and curate on-demand lessons for students.
                </p>

                <section
                    style={{
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                        borderRadius: 16,
                        boxShadow: "0 20px 30px -20px rgba(37,99,235,0.35)",
                        overflow: "hidden",
                        marginBottom: 20,
                    }}
                >
                    <div
                        style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(2,6,23,0.45)",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "#93c5fd" }}>Add recorded class</span>
                    </div>
                    <form onSubmit={handleSubmit} style={{ padding: "16px" }}>
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Video URL (YouTube embed)</label>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                required
                                placeholder="https://www.youtube.com/embed/..."
                                style={inputStyle}
                            />
                        </div>
                        {formError ? (
                            <p style={{ margin: "0 0 12px", color: "#ef4444", fontSize: "0.9rem" }}>{formError}</p>
                        ) : null}
                        {success ? (
                            <p style={{ margin: "0 0 12px", color: "#4ade80", fontSize: "0.9rem" }}>{success}</p>
                        ) : null}
                        <button
                            type="submit"
                            disabled={busy}
                            style={{
                                padding: "8px 14px",
                                borderRadius: 10,
                                border: "1px solid rgba(250,204,21,0.45)",
                                background: busy ? "rgba(51,65,85,0.5)" : "rgba(15,23,42,0.6)",
                                color: "#facc15",
                                fontWeight: 800,
                                fontSize: "0.8125rem",
                                cursor: busy ? "not-allowed" : "pointer",
                                opacity: busy ? 0.7 : 1,
                            }}
                        >
                            {busy ? "Adding…" : "Add Class"}
                        </button>
                    </form>
                </section>

                <section
                    style={{
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                        borderRadius: 16,
                        boxShadow: "0 20px 30px -20px rgba(37,99,235,0.35)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(2,6,23,0.45)",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "#93c5fd" }}>Published classes</span>
                    </div>
                    <div style={{ padding: "16px" }}>
                        {listLoading ? (
                            <p style={{ margin: 0, color: "#9ca3af" }}>Loading…</p>
                        ) : listError ? (
                            <p style={{ margin: 0, color: "#ef4444" }}>{listError}</p>
                        ) : lessons.length === 0 ? (
                            <p style={{ margin: 0, color: "#9ca3af" }}>No recorded classes yet.</p>
                        ) : (
                            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                                {lessons.map((lesson) => (
                                    <li
                                        key={lesson.id}
                                        style={{
                                            border: "1px solid rgba(59,130,246,0.15)",
                                            borderRadius: 12,
                                            padding: "14px 16px",
                                            background: "rgba(15,23,42,0.55)",
                                        }}
                                    >
                                        <div style={{ fontWeight: 800, color: "#f8fafc", marginBottom: 6 }}>
                                            {lesson.title}
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                                            {formatCreatedAt(lesson.created_at)}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
