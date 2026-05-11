"use client"

/**
 * Admin Live Sessions — scheduling & capacity operations only.
 * Extension points: add attendance / waitlists / Zoom host tools under `liveSessions/`
 * or compose new panels beside SessionCardsGrid below.
 */

import type { AdminSessionRow } from "@/components/admin/liveSessions/types"
import LiveSessionCard from "@/components/admin/liveSessions/LiveSessionCard"
import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import CreateSessionModal from "@/app/admin/CreateSessionModal"
import EditSessionModal from "@/app/admin/EditSessionModal"
import SessionBookingsModal from "@/app/admin/SessionBookingsModal"
import { fetchSecureAdminStartUrl } from "@/lib/secureJoinClient"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

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

function SessionCardsGrid({
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
            <p className="px-4 py-8 text-center text-sm text-slate-500">
                No hay sesiones en este periodo.
            </p>
        )
    }

    return (
        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
                <LiveSessionCard
                    key={r.id}
                    row={r}
                    highlighted={highlightedIds.has(r.id)}
                    now={now}
                    onOpenBookings={onOpenBookings}
                    onEditSession={onEditSession}
                    onRequestCancelSession={onRequestCancelSession}
                    onHostStart={onHostStart}
                />
            ))}
        </div>
    )
}

function AccordionWeek({
    id,
    label,
    count,
    open,
    onToggle,
    children,
}: {
    id: string
    label: string
    count: number
    open: boolean
    onToggle: () => void
    children: ReactNode
}) {
    return (
        <div className="border-b border-sky-500/15 last:border-b-0">
            <button
                type="button"
                id={`${id}-trigger`}
                aria-expanded={open}
                aria-controls={`${id}-panel`}
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-sky-500/[0.06]"
            >
                <span className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sky-400">
                        {open ? "▼" : "▶"}
                    </span>
                    <span>
                        <span className="block text-base font-bold tracking-tight text-slate-100">{label}</span>
                        <span className="text-xs font-medium text-slate-500">
                            {count} sesión{count === 1 ? "" : "es"}
                        </span>
                    </span>
                </span>
            </button>
            <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} hidden={!open}>
                {open ? children : null}
            </div>
        </div>
    )
}

export default function AdminSessions() {
    const [rows, setRows] = useState<AdminSessionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedSession, setSelectedSession] = useState<string | null>(null)
    const [isThisWeekOpen, setIsThisWeekOpen] = useState(true)
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

    const highlightedSessionIds = useMemo(() => new Set(soonSessions.map((s) => s.id)), [soonSessions])
    const upcomingSoonSession = useMemo(() => soonSessions[0] ?? null, [soonSessions])

    const adminEmailFromCookie = useMemo(() => {
        if (typeof document === "undefined") return ""
        const key = "ta_student_email="
        const hit = document.cookie
            .split(";")
            .map((p) => p.trim())
            .find((p) => p.startsWith(key))
        if (!hit) return ""
        return decodeURIComponent(hit.slice(key.length)).trim().toLowerCase()
    }, [])

    const handleAdminHostStart = useCallback(
        async (sessionId: string) => {
            const r = await fetchSecureAdminStartUrl(sessionId, adminEmailFromCookie)
            if (r.ok) {
                window.open(r.zoom_start_url, "_blank", "noopener,noreferrer")
            } else {
                window.alert(r.message)
            }
        },
        [adminEmailFromCookie]
    )

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
        <div className="mx-auto max-w-7xl space-y-8 text-[#e5e7eb]">
            <header className="border-b border-white/10 pb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-50 lg:text-[1.65rem]">Live Sessions</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                    Real-time capacity overview — this week and next.
                </p>
            </header>

            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0c1222]/90 px-4 py-4 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.65)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="rounded-lg border border-amber-400/40 bg-[#0f172a]/90 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:border-amber-300/60 hover:bg-[#0f172a]"
                    >
                        + Nueva sesión
                    </button>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                            Total booked
                        </p>
                        <p className="text-lg font-bold tabular-nums text-slate-100">{totalBooked}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4 sm:border-t-0 sm:pt-0">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-600">
                        Filtros
                    </span>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-white/10 bg-transparent px-3 py-1.5 text-xs text-slate-600"
                        title="Próximamente"
                    >
                        Fecha
                    </button>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-white/10 bg-transparent px-3 py-1.5 text-xs text-slate-600"
                        title="Próximamente"
                    >
                        Estado
                    </button>
                </div>
            </div>

            {upcomingSoonSession ? (
                <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-950/25 px-4 py-3 text-amber-100"
                    role="status"
                >
                    <span className="text-sm font-semibold">
                        Tu sesión comienza en menos de 10 minutos
                    </span>
                    <button
                        type="button"
                        onClick={() => void handleAdminHostStart(upcomingSoonSession.id)}
                        className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/25"
                    >
                        Entrar a la sesión
                    </button>
                </div>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#111827] to-[#0a0f1a] shadow-[0_28px_56px_-32px_rgba(37,99,235,0.45)]">
                {loading ? (
                    <p className="px-4 py-12 text-center text-sm text-slate-500">Cargando sesiones…</p>
                ) : error ? (
                    <p className="px-4 py-12 text-center text-sm text-red-400">{error}</p>
                ) : rows.length === 0 ? (
                    <p className="px-4 py-12 text-center text-sm text-slate-500">
                        No hay sesiones programadas. Cree una con «Nueva sesión».
                    </p>
                ) : (
                    <>
                        <AccordionWeek
                            id="week-this"
                            label="Esta semana"
                            count={currentWeekSessions.length}
                            open={isThisWeekOpen}
                            onToggle={() => setIsThisWeekOpen((v) => !v)}
                        >
                            <SessionCardsGrid
                                rows={currentWeekSessions}
                                highlightedIds={highlightedSessionIds}
                                onOpenBookings={setSelectedSession}
                                onEditSession={setEditSession}
                                onRequestCancelSession={setCancelTarget}
                                now={now}
                                onHostStart={handleAdminHostStart}
                            />
                        </AccordionWeek>
                        <AccordionWeek
                            id="week-next"
                            label="Próxima semana"
                            count={nextWeekSessions.length}
                            open={isNextWeekOpen}
                            onToggle={() => setIsNextWeekOpen((v) => !v)}
                        >
                            <SessionCardsGrid
                                rows={nextWeekSessions}
                                highlightedIds={highlightedSessionIds}
                                onOpenBookings={setSelectedSession}
                                onEditSession={setEditSession}
                                onRequestCancelSession={setCancelTarget}
                                now={now}
                                onHostStart={handleAdminHostStart}
                            />
                        </AccordionWeek>
                    </>
                )}
            </section>

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
                    cancelTarget ? `${cancelTarget.date ?? "—"} · ${cancelTarget.time ?? "—"}` : ""
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
        </div>
    )
}
