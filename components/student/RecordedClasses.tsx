"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string
    created_at: string
}

function formatCreatedAt(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export default function RecordedClasses() {
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch("/api/lessons", { cache: "no-store", credentials: "include" })
                const payload = (await res.json().catch(() => null)) as unknown
                if (!res.ok) {
                    const msg =
                        typeof (payload as { error?: unknown })?.error === "string"
                            ? String((payload as { error: unknown }).error)
                            : "Failed to load recorded classes"
                    throw new Error(msg)
                }

                const rows = Array.isArray(payload) ? (payload as Lesson[]) : []
                if (!cancelled) {
                    setLessons(rows)
                    setSelectedId((prev) => prev ?? rows[0]?.id ?? null)
                }
            } catch (e) {
                if (!cancelled) {
                    setLessons([])
                    setSelectedId(null)
                    setError(e instanceof Error ? e.message : "Failed to load recorded classes")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [])

    const selected = useMemo(() => lessons.find((l) => l.id === selectedId) ?? null, [lessons, selectedId])

    const panelStyle: CSSProperties = {
        borderRadius: 12,
        padding: "var(--ds-4)",
        background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
        border: "1px solid rgba(59,130,246,0.2)",
        boxShadow: "0 20px 30px -20px rgba(59,130,246,0.25)",
    }

    return (
        <section aria-label="Recorded classes">
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--ds-4)", alignItems: "start" }}>
                <div style={panelStyle}>
                    <div style={{ margin: "0 0 var(--ds-3)", color: "#f8fafc", fontSize: "1.0625rem", fontWeight: 700 }}>
                        Recorded Classes
                    </div>

                    {loading ? (
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Loading…</p>
                    ) : error ? (
                        <p style={{ margin: 0, color: "#ef4444", fontSize: "0.9rem" }}>{error}</p>
                    ) : !selected ? (
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>No recorded classes available yet.</p>
                    ) : (
                        <>
                            <p style={{ margin: "0 0 var(--ds-3)", color: "#e2e8f0", fontWeight: 700 }}>
                                {selected.title}
                            </p>
                            <div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    paddingTop: "56.25%",
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    border: "1px solid rgba(148,163,184,0.18)",
                                    background: "rgba(2,6,23,0.55)",
                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.35)",
                                }}
                            >
                                <iframe
                                    title={selected.title}
                                    src={selected.video_url}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        border: "none",
                                    }}
                                />
                            </div>
                            {selected.description ? (
                                <p style={{ margin: "var(--ds-3) 0 0", color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                                    {selected.description}
                                </p>
                            ) : null}
                        </>
                    )}
                </div>

                <div style={panelStyle}>
                    <div style={{ margin: "0 0 var(--ds-3)", color: "#93c5fd", fontSize: "0.95rem", fontWeight: 800 }}>
                        Lessons
                    </div>

                    {loading ? (
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Loading…</p>
                    ) : lessons.length === 0 ? (
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>No lessons yet.</p>
                    ) : (
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--ds-2)" }}>
                            {lessons.map((l) => {
                                const active = l.id === selectedId
                                return (
                                    <li key={l.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(l.id)}
                                            style={{
                                                width: "100%",
                                                textAlign: "left",
                                                padding: "12px 12px",
                                                borderRadius: 12,
                                                border: active ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(148,163,184,0.16)",
                                                background: active ? "rgba(30,64,175,0.18)" : "rgba(15,23,42,0.55)",
                                                color: "#e2e8f0",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <div style={{ fontWeight: 800, fontSize: "0.9rem", color: active ? "#bfdbfe" : "#f8fafc" }}>
                                                {l.title}
                                            </div>
                                            <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#94a3b8" }}>
                                                {formatCreatedAt(l.created_at)}
                                            </div>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    )
}

