"use client"

import { useSession } from "@/context/SessionContext"
import { useCallback, useEffect, useState } from "react"

export type StudentNotificationRow = {
    id: string
    user_email: string
    message: string
    read: boolean
    created_at: string
}

function formatWhen(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString("es", {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

export default function StudentNotificationsSection() {
    const { userEmail, dashboardDataReady } = useSession()
    const [items, setItems] = useState<StudentNotificationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!userEmail) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/notifications?user_email=${encodeURIComponent(userEmail)}`,
                { cache: "no-store" }
            )
            const payload = (await res.json().catch(() => [])) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: unknown })?.error === "string"
                        ? (payload as { error: string }).error
                        : "No se pudieron cargar los avisos"
                throw new Error(msg)
            }
            setItems(Array.isArray(payload) ? (payload as StudentNotificationRow[]) : [])
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error al cargar avisos")
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [userEmail])

    useEffect(() => {
        if (!dashboardDataReady || !userEmail) return
        void load()
        const t = setInterval(() => void load(), 60_000)
        return () => clearInterval(t)
    }, [dashboardDataReady, userEmail, load])

    useEffect(() => {
        if (!dashboardDataReady || !userEmail) return
        const onVis = () => {
            if (document.visibilityState === "visible") void load()
        }
        document.addEventListener("visibilitychange", onVis)
        return () => document.removeEventListener("visibilitychange", onVis)
    }, [dashboardDataReady, userEmail, load])

    const unreadCount = items.filter((n) => !n.read).length

    return (
        <section aria-labelledby="avisos-title">
            <h2
                id="avisos-title"
                style={{
                    margin: "0 0 var(--ds-3)",
                    color: "var(--ds-text)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--ds-2)",
                    flexWrap: "wrap",
                }}
            >
                Avisos
                {unreadCount > 0 ? (
                    <span
                        aria-label={`${unreadCount} sin leer`}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 26,
                            height: 26,
                            padding: "0 8px",
                            borderRadius: "var(--ds-r-full)",
                            background: "linear-gradient(180deg, #facc15 0%, #ca8a04 100%)",
                            color: "#0f172a",
                            fontSize: "0.8125rem",
                            fontWeight: 800,
                            boxShadow: "0 2px 10px rgba(250,204,21,0.35)",
                        }}
                    >
                        {unreadCount}
                    </span>
                ) : null}
            </h2>
            <div
                style={{
                    borderRadius: 12,
                    padding: "var(--ds-4)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "0 20px 30px -20px rgba(37,99,235,0.25)",
                }}
            >
                {loading ? (
                    <p style={{ margin: 0, color: "var(--ds-text-muted)", fontSize: "0.9375rem" }}>Cargando…</p>
                ) : error ? (
                    <p style={{ margin: 0, color: "var(--ds-danger)", fontSize: "0.9375rem" }}>{error}</p>
                ) : items.length === 0 ? (
                    <p
                        style={{
                            margin: 0,
                            textAlign: "center",
                            color: "var(--ds-text-muted)",
                            fontSize: "0.9375rem",
                            lineHeight: 1.5,
                        }}
                    >
                        No tienes avisos nuevos.
                    </p>
                ) : (
                    <ul
                        style={{
                            margin: 0,
                            padding: 0,
                            listStyle: "none",
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--ds-3)",
                        }}
                    >
                        {items.map((n) => {
                            const unread = !n.read
                            return (
                                <li
                                    key={n.id}
                                    style={{
                                        padding: "var(--ds-3)",
                                        borderRadius: "var(--ds-r-md)",
                                        border: unread
                                            ? "1px solid rgba(250,204,21,0.45)"
                                            : "1px solid var(--ds-border-subtle)",
                                        background: unread
                                            ? "rgba(250,204,21,0.06)"
                                            : "rgba(15,23,42,0.5)",
                                        borderLeft: unread ? "4px solid #facc15" : "4px solid rgba(148,163,184,0.25)",
                                        boxShadow: unread ? "0 0 20px rgba(250,204,21,0.08)" : "none",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: "var(--ds-2)",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 800,
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                color: unread ? "#facc15" : "var(--ds-text-muted)",
                                            }}
                                        >
                                            {unread ? "Sin leer" : "Leído"}
                                        </span>
                                        <time
                                            dateTime={n.created_at}
                                            style={{
                                                fontSize: "0.75rem",
                                                color: "var(--ds-text-muted)",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {formatWhen(n.created_at)}
                                        </time>
                                    </div>
                                    <p
                                        style={{
                                            margin: 0,
                                            color: "var(--ds-text-secondary)",
                                            fontSize: "0.9375rem",
                                            lineHeight: 1.55,
                                        }}
                                    >
                                        {n.message}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </section>
    )
}
