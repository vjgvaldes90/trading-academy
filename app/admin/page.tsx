"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import CreateSessionModal from "@/app/admin/CreateSessionModal"
import EditSessionModal from "@/app/admin/EditSessionModal"
import SessionBookingsModal from "@/app/admin/SessionBookingsModal"
import { fetchSecureAdminStartUrl } from "@/lib/secureJoinClient"
import { isWithinAdminHostWindow, type DbSession } from "@/lib/sessions"

type AdminSessionRow = {
    id: string
    title?: string | null
    date: string | null
    time: string | null
    capacity: number | null
    booked: number | null
    status?: string
    starts_soon?: boolean
    is_live?: boolean
}

function adminRowToDbSession(r: AdminSessionRow): DbSession {
    const cap = typeof r.capacity === "number" ? r.capacity : 0
    const booked = typeof r.booked === "number" ? r.booked : 0
    return {
        id: r.id,
        day: null,
        date: r.date,
        time: r.time,
        max_slots: cap,
        booked_slots: booked,
        link: null,
    }
}

function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Parse session date (YYYY-MM-DD or ISO) to local midnight, or null. */
function parseSessionDate(raw: string | null): Date | null {
    if (!raw || typeof raw !== "string") return null
    const trimmed = raw.trim()
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
    if (m) {
        const y = Number(m[1])
        const mo = Number(m[2]) - 1
        const da = Number(m[3])
        const d = new Date(y, mo, da)
        return Number.isNaN(d.getTime()) ? null : startOfLocalDay(d)
    }
    const d = new Date(trimmed)
    if (Number.isNaN(d.getTime())) return null
    return startOfLocalDay(d)
}

/** Days from `from` (local date) until next Sunday on or after `from` (0 = Sunday). */
function daysUntilSunday(from: Date): number {
    const dow = from.getDay()
    return dow === 0 ? 0 : 7 - dow
}

function addDays(d: Date, n: number): Date {
    const out = new Date(d.getTime())
    out.setDate(out.getDate() + n)
    return startOfLocalDay(out)
}

function parseSessionDateTime(dateRaw: string | null, timeRaw: string | null): Date | null {
    if (!dateRaw || !timeRaw) return null
    const d = dateRaw.trim()
    const t = timeRaw.trim()
    if (!d || !t) return null
    const dt = new Date(`${d}T${t}`)
    return Number.isNaN(dt.getTime()) ? null : dt
}

/**
 * Current week: today → Sunday of the same calendar week (inclusive).
 * Next week: Monday after that Sunday → following Sunday (inclusive).
 */
function getWeekBoundaries(now = new Date()) {
    const today = startOfLocalDay(now)
    const endCurrentWeek = addDays(today, daysUntilSunday(today))
    const startNextWeek = addDays(endCurrentWeek, 1)
    const endNextWeek = addDays(startNextWeek, daysUntilSunday(startNextWeek))
    return { today, endCurrentWeek, startNextWeek, endNextWeek }
}

function splitSessionsByWeek(rows: AdminSessionRow[]) {
    const { today, endCurrentWeek, startNextWeek, endNextWeek } = getWeekBoundaries()
    const currentWeekSessions: AdminSessionRow[] = []
    const nextWeekSessions: AdminSessionRow[] = []

    for (const row of rows) {
        const d = parseSessionDate(row.date)
        if (!d) continue
        if (d.getTime() >= today.getTime() && d.getTime() <= endCurrentWeek.getTime()) {
            currentWeekSessions.push(row)
        } else if (d.getTime() >= startNextWeek.getTime() && d.getTime() <= endNextWeek.getTime()) {
            nextWeekSessions.push(row)
        }
    }

    const byDateTime = (a: AdminSessionRow, b: AdminSessionRow) => {
        const da = (a.date ?? "").localeCompare(b.date ?? "")
        if (da !== 0) return da
        return (a.time ?? "").localeCompare(b.time ?? "")
    }
    currentWeekSessions.sort(byDateTime)
    nextWeekSessions.sort(byDateTime)

    return { currentWeekSessions, nextWeekSessions }
}

/** Green &gt;5, yellow 1–5, red at 0 (≤0 treated as full / over-capacity). */
function availableIndicatorColor(available: number): string {
    if (available <= 0) return "#f87171"
    if (available <= 5) return "#fbbf24"
    return "#4ade80"
}

function availabilityLabel(available: number): { text: string; color: string } | null {
    if (available === 0) return { text: "FULL", color: "#fca5a5" }
    if (available > 0 && available <= 2) return { text: "⚠️ Almost full", color: "#fcd34d" }
    return null
}

function occupancyPercentRounded(booked: number, capacity: number): number | null {
    if (!Number.isFinite(capacity) || capacity <= 0) return null
    return Math.round((booked / capacity) * 100)
}

/** Bar fill: green &lt;70%, yellow 70–99%, red at 100%+ (over-capacity uses red). */
function fillBarColor(percent: number): string {
    if (percent >= 100) return "#f87171"
    if (percent >= 70) return "#fbbf24"
    return "#4ade80"
}

function clampFillWidthPercent(percent: number): number {
    if (!Number.isFinite(percent)) return 0
    return Math.min(100, Math.max(0, percent))
}

function AdminSessionsTable({
    rows,
    highlightedIds,
    onOpenBookings,
    onEditSession,
    onRequestCancelSession,
    now,
    onHostStart,
}: {
    rows: AdminSessionRow[]
    highlightedIds: Set<string>
    onOpenBookings: (sessionId: string) => void
    onEditSession: (row: AdminSessionRow) => void
    onRequestCancelSession: (row: AdminSessionRow) => void
    now: Date
    onHostStart: (sessionId: string) => void | Promise<void>
}) {
    if (rows.length === 0) {
        return (
            <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>No sessions in this period.</p>
        )
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1040 }}>
                <thead>
                    <tr style={{ background: "rgba(15,23,42,0.7)" }}>
                        {[
                            { h: "Date", align: "left" as const },
                            { h: "Time", align: "left" as const },
                            { h: "Capacity", align: "left" as const },
                            { h: "Booked", align: "left" as const },
                            { h: "Available", align: "left" as const },
                            { h: "Fill %", align: "left" as const },
                            { h: "Actions", align: "right" as const },
                        ].map(({ h, align }) => (
                            <th
                                key={h}
                                style={{
                                    textAlign: align,
                                    padding: "12px 14px",
                                    color: "#cbd5e1",
                                    fontSize: "0.8rem",
                                    letterSpacing: "0.02em",
                                    textTransform: "uppercase",
                                    borderBottom: "1px solid rgba(59,130,246,0.2)",
                                }}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const capacity = typeof r.capacity === "number" ? r.capacity : 0
                        const booked = typeof r.booked === "number" ? r.booked : 0
                        const available = capacity - booked
                        const availColor = availableIndicatorColor(available)
                        const pct = occupancyPercentRounded(booked, capacity)
                        const availLabel = availabilityLabel(available)
                        const hostAllowed =
                            (r.status ?? "active") === "active" &&
                            isWithinAdminHostWindow(adminRowToDbSession(r), now)
                        return (
                            <tr
                                key={r.id}
                                style={{
                                    borderBottom: "1px solid rgba(148,163,184,0.12)",
                                    background: highlightedIds.has(r.id)
                                        ? "rgba(234,179,8,0.08)"
                                        : "transparent",
                                }}
                            >
                                <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>{r.date ?? "—"}</td>
                                <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>{r.time ?? "—"}</td>
                                <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>{capacity}</td>
                                <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>{booked}</td>
                                <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            alignItems: "center",
                                            gap: "8px 10px",
                                            lineHeight: 1.25,
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: availColor,
                                                fontWeight: 800,
                                                fontSize: "1.05rem",
                                                fontVariantNumeric: "tabular-nums",
                                            }}
                                        >
                                            {available}
                                        </span>
                                        {availLabel ? (
                                            <span
                                                style={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: 800,
                                                    letterSpacing: "0.03em",
                                                    textTransform: availLabel.text === "FULL" ? "uppercase" : "none",
                                                    color: availLabel.color,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {availLabel.text}
                                            </span>
                                        ) : null}
                                    </div>
                                </td>
                                <td
                                    style={{
                                        padding: "12px 14px",
                                        verticalAlign: "middle",
                                        minWidth: 112,
                                        maxWidth: 140,
                                    }}
                                >
                                    {pct === null ? (
                                        <span style={{ color: "#64748b", fontWeight: 600 }}>—</span>
                                    ) : (
                                        <div style={{ width: "100%", maxWidth: 128 }}>
                                            <div
                                                style={{
                                                    fontWeight: 800,
                                                    fontSize: "0.875rem",
                                                    color: "#e2e8f0",
                                                    fontVariantNumeric: "tabular-nums",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                {pct}%
                                            </div>
                                            <div
                                                role="presentation"
                                                style={{
                                                    height: 9,
                                                    borderRadius: 9999,
                                                    background: "rgba(51,65,85,0.9)",
                                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.35)",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        height: "100%",
                                                        width: `${clampFillWidthPercent(pct)}%`,
                                                        borderRadius: 9999,
                                                        background: fillBarColor(pct),
                                                        boxShadow: "0 0 12px rgba(255,255,255,0.08)",
                                                        transition: "width 0.45s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            justifyContent: "flex-end",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => onEditSession(r)}
                                            style={{
                                                padding: "8px 14px",
                                                borderRadius: 10,
                                                border: "1px solid rgba(148,163,184,0.4)",
                                                background: "rgba(15,23,42,0.75)",
                                                color: "#e2e8f0",
                                                fontWeight: 700,
                                                fontSize: "0.8125rem",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRequestCancelSession(r)}
                                            style={{
                                                padding: "8px 14px",
                                                borderRadius: 10,
                                                border: "1px solid rgba(248,113,113,0.45)",
                                                background: "rgba(127,29,29,0.35)",
                                                color: "#fecaca",
                                                fontWeight: 700,
                                                fontSize: "0.8125rem",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            Cancelar sesión
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!hostAllowed}
                                            onClick={() => void onHostStart(r.id)}
                                            style={{
                                                padding: "8px 14px",
                                                borderRadius: 10,
                                                border: "1px solid rgba(59,130,246,0.45)",
                                                background: "rgba(30,64,175,0.35)",
                                                color: "#bfdbfe",
                                                fontWeight: 700,
                                                fontSize: "0.8125rem",
                                                cursor: hostAllowed ? "pointer" : "not-allowed",
                                                opacity: hostAllowed ? 1 : 0.55,
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            Entrar como anfitrión (Zoom)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onOpenBookings(r.id)}
                                            style={{
                                                padding: "8px 14px",
                                                borderRadius: 10,
                                                border: "1px solid rgba(250,204,21,0.45)",
                                                background: "linear-gradient(180deg, #facc15 0%, #ca8a04 100%)",
                                                color: "#0f172a",
                                                fontWeight: 800,
                                                fontSize: "0.8125rem",
                                                cursor: "pointer",
                                                boxShadow: "0 4px 14px rgba(250,204,21,0.25)",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            Ver inscritos
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default function AdminSessionsPage() {
    const [rows, setRows] = useState<AdminSessionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedSession, setSelectedSession] = useState<string | null>(null)
    const [isThisWeekOpen, setIsThisWeekOpen] = useState(false)
    const [isNextWeekOpen, setIsNextWeekOpen] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [editSession, setEditSession] = useState<AdminSessionRow | null>(null)
    const [cancelTarget, setCancelTarget] = useState<AdminSessionRow | null>(null)
    const [now, setNow] = useState(() => new Date())

    const loadSessions = useCallback(async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
        const silent = opts?.silent === true
        const signal = opts?.signal
        if (!silent) setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/sessions", {
                cache: "no-store",
                credentials: "include",
                signal,
            })

            const payload = (await res.json().catch(() => [])) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: unknown })?.error === "string"
                        ? (payload as { error: string }).error
                        : "Failed to load admin sessions"
                throw new Error(msg)
            }

            if (signal?.aborted) return
            setRows(Array.isArray(payload) ? (payload as AdminSessionRow[]) : [])
        } catch (e: unknown) {
            if (e instanceof DOMException && e.name === "AbortError") return
            if (!signal?.aborted) {
                setError(e instanceof Error ? e.message : "Error loading sessions")
            }
        } finally {
            if (!signal?.aborted && !silent) setLoading(false)
        }
    }, [])

    useEffect(() => {
        const ac = new AbortController()
        void loadSessions({ silent: false, signal: ac.signal })
        return () => ac.abort()
    }, [loadSessions])

    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 30_000)
        return () => window.clearInterval(t)
    }, [])

    const totalBooked = useMemo(
        () => rows.reduce((acc, r) => acc + (typeof r.booked === "number" ? r.booked : 0), 0),
        [rows]
    )

    const { currentWeekSessions, nextWeekSessions } = useMemo(() => splitSessionsByWeek(rows), [rows])
    const soonSessions = useMemo(() => {
        return rows.filter((r) => {
            const at = parseSessionDateTime(r.date, r.time)
            if (!at) return false
            const diffInMinutes = (at.getTime() - now.getTime()) / (1000 * 60)
            return diffInMinutes <= 10 && diffInMinutes > 0
        })
    }, [rows, now])

    const highlightedSessionIds = useMemo(
        () => new Set(soonSessions.map((s) => s.id)),
        [soonSessions]
    )

    const upcomingSoonSession = useMemo(() => soonSessions[0] ?? null, [soonSessions])

    const handleAdminHostStart = useCallback(async (sessionId: string) => {
        const r = await fetchSecureAdminStartUrl(sessionId)
        if (r.ok) {
            window.open(r.zoom_start_url, "_blank", "noopener,noreferrer")
        } else {
            window.alert(r.message)
        }
    }, [])

    const handleBookingCancelled = (sessionId: string) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === sessionId && typeof r.booked === "number" && r.booked > 0
                    ? { ...r, booked: r.booked - 1 }
                    : r
            )
        )
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#0B0F1A",
                color: "#e5e7eb",
                padding: "28px 20px",
            }}
        >
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <header style={{ marginBottom: 18 }}>
                    <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>
                        Admin · Sessions
                    </h1>
                    <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: "0.95rem" }}>
                        Real-time capacity overview
                    </p>
                </header>
                {upcomingSoonSession ? (
                    <div
                        style={{
                            marginBottom: 14,
                            borderRadius: 12,
                            border: "1px solid rgba(250,204,21,0.45)",
                            background: "rgba(120,53,15,0.25)",
                            color: "#fde68a",
                            padding: "10px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <span style={{ fontWeight: 700 }}>
                            ⚠️ Tu sesión comienza en menos de 10 minutos
                        </span>
                        <button
                            type="button"
                            onClick={() => void handleAdminHostStart(upcomingSoonSession.id)}
                            style={{
                                borderRadius: 10,
                                border: "1px solid rgba(250,204,21,0.55)",
                                background: "rgba(250,204,21,0.18)",
                                color: "#fde68a",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                padding: "8px 12px",
                                cursor: "pointer",
                            }}
                        >
                            Entrar a la sesión
                        </button>
                    </div>
                ) : null}

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
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(2,6,23,0.45)",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "#93c5fd" }}>Sessions Dashboard</span>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                            <Link
                                href="/admin/students"
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(59,130,246,0.4)",
                                    background: "rgba(15,23,42,0.6)",
                                    color: "#93c5fd",
                                    fontWeight: 800,
                                    fontSize: "0.8125rem",
                                    textDecoration: "none",
                                }}
                            >
                                Students · access
                            </Link>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(250,204,21,0.45)",
                                    background: "rgba(15,23,42,0.6)",
                                    color: "#facc15",
                                    fontWeight: 800,
                                    fontSize: "0.8125rem",
                                    cursor: "pointer",
                                    transition: "background 0.2s ease, color 0.2s ease",
                                }}
                            >
                                + Nueva sesión
                            </button>
                            <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                                Total booked: <strong style={{ color: "#f8fafc" }}>{totalBooked}</strong>
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>Loading…</p>
                    ) : error ? (
                        <p style={{ margin: 0, padding: "16px", color: "#ef4444" }}>{error}</p>
                    ) : rows.length === 0 ? (
                        <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>No sessions found.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <button
                                type="button"
                                onClick={() => setIsThisWeekOpen((v) => !v)}
                                aria-expanded={isThisWeekOpen}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    width: "100%",
                                    margin: 0,
                                    padding: "12px 16px",
                                    border: "none",
                                    borderBottom: "1px solid rgba(59,130,246,0.12)",
                                    background: "transparent",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "1rem",
                                    fontWeight: 800,
                                    color: "#e2e8f0",
                                    letterSpacing: "0.02em",
                                    transition:
                                        "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(59,130,246,0.08)"
                                    e.currentTarget.style.color = "#f8fafc"
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent"
                                    e.currentTarget.style.color = "#e2e8f0"
                                }}
                            >
                                <span
                                    aria-hidden
                                    style={{
                                        display: "inline-block",
                                        width: "1.1em",
                                        color: "#93c5fd",
                                        transition: "color 0.2s ease",
                                    }}
                                >
                                    {isThisWeekOpen ? "▼" : "▶"}
                                </span>
                                This Week
                            </button>
                            {isThisWeekOpen ? (
                                <AdminSessionsTable
                                    rows={currentWeekSessions}
                                    highlightedIds={highlightedSessionIds}
                                    onOpenBookings={setSelectedSession}
                                    onEditSession={setEditSession}
                                    onRequestCancelSession={setCancelTarget}
                                    now={now}
                                    onHostStart={handleAdminHostStart}
                                />
                            ) : null}

                            <button
                                type="button"
                                onClick={() => setIsNextWeekOpen((v) => !v)}
                                aria-expanded={isNextWeekOpen}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    width: "100%",
                                    margin: 0,
                                    padding: "14px 16px 12px",
                                    border: "none",
                                    borderTop: "1px solid rgba(59,130,246,0.15)",
                                    borderBottom: "1px solid rgba(59,130,246,0.12)",
                                    background: "transparent",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "1rem",
                                    fontWeight: 800,
                                    color: "#e2e8f0",
                                    letterSpacing: "0.02em",
                                    transition:
                                        "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(59,130,246,0.08)"
                                    e.currentTarget.style.color = "#f8fafc"
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent"
                                    e.currentTarget.style.color = "#e2e8f0"
                                }}
                            >
                                <span
                                    aria-hidden
                                    style={{
                                        display: "inline-block",
                                        width: "1.1em",
                                        color: "#93c5fd",
                                        transition: "transform 0.2s ease",
                                    }}
                                >
                                    {isNextWeekOpen ? "▼" : "▶"}
                                </span>
                                Next Week
                            </button>
                            {isNextWeekOpen ? (
                                <AdminSessionsTable
                                    rows={nextWeekSessions}
                                    highlightedIds={highlightedSessionIds}
                                    onOpenBookings={setSelectedSession}
                                    onEditSession={setEditSession}
                                    onRequestCancelSession={setCancelTarget}
                                    now={now}
                                    onHostStart={handleAdminHostStart}
                                />
                            ) : null}
                        </div>
                    )}
                </section>
            </div>

            <CreateSessionModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={async () => {
                    await loadSessions({ silent: true })
                }}
            />

            <EditSessionModal
                key={editSession?.id ?? "edit-session-closed"}
                open={editSession !== null}
                session={editSession}
                onClose={() => setEditSession(null)}
                onSuccess={async () => {
                    await loadSessions({ silent: true })
                }}
            />

            <CancelSessionConfirmModal
                open={cancelTarget !== null}
                sessionSummary={
                    cancelTarget
                        ? `${cancelTarget.date ?? "—"} · ${cancelTarget.time ?? "—"}`
                        : ""
                }
                onClose={() => setCancelTarget(null)}
                onConfirm={async () => {
                    if (!cancelTarget) return
                    const res = await fetch(`/api/admin/sessions/${cancelTarget.id}`, {
                        method: "DELETE",
                        cache: "no-store",
                        credentials: "include",
                    })
                    const payload = (await res.json().catch(() => ({}))) as { error?: string }
                    if (!res.ok) {
                        throw new Error(
                            typeof payload.error === "string" ? payload.error : "Failed to cancel session"
                        )
                    }
                    await loadSessions({ silent: true })
                }}
            />

            {selectedSession ? (
                <SessionBookingsModal
                    sessionId={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onBookingCancelled={handleBookingCancelled}
                />
            ) : null}
        </main>
    )
}
