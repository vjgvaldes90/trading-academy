"use client"

import type { AdminSessionRow } from "@/components/admin/liveSessions/types"
import { isWithinAdminHostWindow, type DbSession } from "@/lib/sessions"

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

function availableIndicatorColor(available: number): string {
    if (available <= 0) return "#f87171"
    if (available <= 5) return "#fbbf24"
    return "#4ade80"
}

function availabilityLabel(available: number): { text: string; color: string } | null {
    if (available === 0) return { text: "COMPLETO", color: "#fca5a5" }
    if (available > 0 && available <= 2) return { text: "Casi lleno", color: "#fcd34d" }
    return null
}

function occupancyPercentRounded(booked: number, capacity: number): number | null {
    if (!Number.isFinite(capacity) || capacity <= 0) return null
    return Math.round((booked / capacity) * 100)
}

function fillBarColor(percent: number): string {
    if (percent >= 100) return "#f87171"
    if (percent >= 70) return "#fbbf24"
    return "#4ade80"
}

function clampFillWidthPercent(percent: number): number {
    if (!Number.isFinite(percent)) return 0
    return Math.min(100, Math.max(0, percent))
}

/**
 * Single live session row — capacity, host window, bookings.
 * Extend this component when adding attendance, waitlists, or extra Zoom controls.
 */
export default function LiveSessionCard({
    row,
    highlighted,
    now,
    onOpenBookings,
    onEditSession,
    onRequestCancelSession,
    onHostStart,
}: {
    row: AdminSessionRow
    highlighted: boolean
    now: Date
    onOpenBookings: (sessionId: string) => void
    onEditSession: (row: AdminSessionRow) => void
    onRequestCancelSession: (row: AdminSessionRow) => void
    onHostStart: (sessionId: string) => void | Promise<void>
}) {
    const capacity = typeof row.capacity === "number" ? row.capacity : 0
    const booked = typeof row.booked === "number" ? row.booked : 0
    const available = capacity - booked
    const availColor = availableIndicatorColor(available)
    const pct = occupancyPercentRounded(booked, capacity)
    const availLabel = availabilityLabel(available)
    const hostAllowed =
        (row.status ?? "active") === "active" && isWithinAdminHostWindow(adminRowToDbSession(row), now)

    const title = row.title?.trim() || "Sesión en vivo"

    return (
        <article
            className={`flex flex-col rounded-xl border transition-colors ${
                highlighted
                    ? "border-amber-500/35 bg-amber-500/[0.06] shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                    : "border-white/10 bg-[#0f172a]/80 hover:border-sky-500/25"
            }`}
        >
            <div className="border-b border-white/10 px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                    {row.date ?? "—"} · {row.time ?? "—"}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100">{title}</h3>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Capacidad</p>
                        <p className="mt-0.5 font-semibold tabular-nums text-slate-200">{capacity}</p>
                    </div>
                    <div>
                        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Reservas</p>
                        <p className="mt-0.5 font-semibold tabular-nums text-slate-200">{booked}</p>
                    </div>
                </div>

                <div>
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Disponibles</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                            className="text-lg font-bold tabular-nums"
                            style={{ color: availColor }}
                        >
                            {available}
                        </span>
                        {availLabel ? (
                            <span
                                className={`text-[0.7rem] font-bold ${
                                    availLabel.text === "COMPLETO" ? "uppercase" : ""
                                }`}
                                style={{ color: availLabel.color }}
                            >
                                {availLabel.text}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Ocupación</p>
                        {pct === null ? (
                            <span className="text-sm font-semibold text-slate-500">—</span>
                        ) : (
                            <span className="text-sm font-bold tabular-nums text-slate-200">{pct}%</span>
                        )}
                    </div>
                    {pct !== null ? (
                        <div
                            className="h-2 overflow-hidden rounded-full bg-slate-700/90 shadow-inner"
                            role="presentation"
                        >
                            <div
                                className="h-full rounded-full shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-300"
                                style={{
                                    width: `${clampFillWidthPercent(pct)}%`,
                                    background: fillBarColor(pct),
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-auto flex flex-col gap-2 border-t border-white/10 bg-black/20 px-3 py-3">
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onEditSession(row)}
                        className="rounded-lg border border-slate-500/40 bg-slate-900/75 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-400/60"
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        onClick={() => onRequestCancelSession(row)}
                        className="rounded-lg border border-red-400/45 bg-red-950/35 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-950/50"
                    >
                        Cancelar sesión
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={!hostAllowed}
                        onClick={() => void onHostStart(row.id)}
                        className="rounded-lg border border-sky-500/45 bg-blue-950/40 px-3 py-2 text-xs font-bold text-sky-200 transition enabled:cursor-pointer enabled:hover:bg-blue-950/60 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                        Entrar como anfitrión (Zoom)
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenBookings(row.id)}
                        className="rounded-lg border border-amber-400/45 bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-2 text-xs font-extrabold text-slate-950 shadow-[0_4px_14px_rgba(250,204,21,0.25)] transition hover:brightness-105"
                    >
                        Ver inscritos
                    </button>
                </div>
            </div>
        </article>
    )
}
