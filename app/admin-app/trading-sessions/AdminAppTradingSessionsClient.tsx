"use client"

import type { AdminSessionRow } from "@/components/admin/liveSessions/types"
import { useLanguage } from "@/context/LanguageProvider"
import { getMinutesUntilSessionStart, type DbSession } from "@/lib/sessions"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

type TypeFilter = "all" | "trading" | "theory"

type ListErrorPayload = {
    error?: string
    details?: string
}

function toDbSession(row: AdminSessionRow): DbSession {
    return {
        id: row.id,
        day: null,
        date: row.date,
        time: row.time,
        link: null,
        session_type: row.session_type === "theory" ? "theory" : "trading",
    }
}

function byDateTimeAsc(a: AdminSessionRow, b: AdminSessionRow): number {
    const da = (a.date ?? "").localeCompare(b.date ?? "")
    if (da !== 0) return da
    return (a.time ?? "").localeCompare(b.time ?? "")
}

function formatTimeDisplay(raw: string | null | undefined): string {
    if (!raw) return "—"
    const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim())
    if (!m) return raw
    return `${m[1].padStart(2, "0")}:${m[2]}`
}

function isTheory(row: AdminSessionRow): boolean {
    return (row.session_type ?? "trading") === "theory"
}

export default function AdminAppTradingSessionsClient() {
    const { t } = useLanguage()
    const [rows, setRows] = useState<AdminSessionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
    const [now, setNow] = useState(() => new Date())
    const [createOpen, setCreateOpen] = useState(false)
    const [createDate, setCreateDate] = useState("")
    const [createTime, setCreateTime] = useState("")
    const [createType, setCreateType] = useState<"trading" | "theory">("trading")
    const [createBusy, setCreateBusy] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/sessions", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const errObj = (payload ?? {}) as ListErrorPayload
                const base =
                    typeof errObj.error === "string" && errObj.error.trim()
                        ? errObj.error
                        : t.failedToLoadAdminSessions
                const detail =
                    typeof errObj.details === "string" && errObj.details.trim()
                        ? `${base}: ${errObj.details}`
                        : base
                throw new Error(detail)
            }
            setRows(Array.isArray(payload) ? (payload as AdminSessionRow[]) : [])
        } catch (e) {
            setError(e instanceof Error ? e.message : t.errorLoadingSessions)
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [t.errorLoadingSessions, t.failedToLoadAdminSessions])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 30_000)
        return () => window.clearInterval(interval)
    }, [])

    const upcoming = useMemo(() => {
        return rows
            .filter((row) => {
                const minutesUntil = getMinutesUntilSessionStart(toDbSession(row), now)
                return minutesUntil != null && minutesUntil >= 0
            })
            .sort(byDateTimeAsc)
    }, [rows, now])

    const filtered = useMemo(() => {
        if (typeFilter === "trading") return upcoming.filter((r) => !isTheory(r))
        if (typeFilter === "theory") return upcoming.filter((r) => isTheory(r))
        return upcoming
    }, [upcoming, typeFilter])

    const openCreate = (sessionType: "trading" | "theory" = "trading") => {
        setCreateDate("")
        setCreateTime("")
        setCreateType(sessionType)
        setCreateError(null)
        setCreateOpen(true)
    }

    const closeCreate = () => {
        if (createBusy) return
        setCreateOpen(false)
        setCreateError(null)
    }

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (createBusy) return
        setCreateError(null)

        if (!createDate.trim()) {
            setCreateError(t.createSessionDateRequired)
            return
        }
        if (!createTime.trim()) {
            setCreateError(t.createSessionTimeRequired)
            return
        }

        setCreateBusy(true)
        try {
            const res = await fetch("/api/admin/sessions/create", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    date: createDate.trim(),
                    time: createTime.trim(),
                    session_type: createType,
                }),
            })
            const payload = (await res.json().catch(() => ({}))) as ListErrorPayload
            if (!res.ok) {
                const base =
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.createSessionFailed
                const detail =
                    typeof payload.details === "string" && payload.details.trim()
                        ? `${base}: ${payload.details}`
                        : base
                throw new Error(detail)
            }
            setCreateOpen(false)
            setSuccessMessage(t.adminAppTradingSessionsCreateSuccess)
            await load()
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : t.createSessionError)
        } finally {
            setCreateBusy(false)
        }
    }

    const filters: { id: TypeFilter; label: string }[] = [
        { id: "all", label: t.adminAppTradingSessionsFilterAll },
        { id: "trading", label: t.adminAppTradingSessionsFilterTrading },
        { id: "theory", label: t.adminAppTradingSessionsFilterTheory },
    ]

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.1),transparent_36%)]"
            />

            <header className="relative z-10 mb-5 pr-[5.5rem]">
                <Link
                    href="/admin-app"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppTradingSessionsBackHome}
                </Link>

                <div className="mt-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-blue-300">
                        <Calendar className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {t.adminLiveSessions}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            {t.adminAppTradingSessionsSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            <div className="relative z-10 mb-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => openCreate("trading")}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2.5 text-sm font-bold text-amber-100 transition active:bg-amber-500/25"
                >
                    + {t.adminNewSession}
                </button>
                <button
                    type="button"
                    onClick={() => openCreate("theory")}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/15 px-3 py-2.5 text-sm font-bold text-violet-100 transition active:bg-violet-500/25"
                >
                    + {t.adminNewClass}
                </button>
            </div>

            <div className="relative z-10 -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {filters.map((f) => {
                    const active = typeFilter === f.id
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setTypeFilter(f.id)}
                            className={[
                                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                active
                                    ? "border-blue-400/40 bg-blue-600/25 text-blue-100"
                                    : "border-white/10 bg-white/[0.03] text-slate-400 active:bg-white/[0.06]",
                            ].join(" ")}
                        >
                            {f.label}
                        </button>
                    )
                })}
            </div>

            <section className="relative z-10 flex-1">
                {successMessage ? (
                    <p className="mb-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        {successMessage}
                    </p>
                ) : null}

                {loading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.loadingSessions}
                    </p>
                ) : error && filtered.length === 0 && rows.length === 0 ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                        <p className="text-sm text-red-200">{error}</p>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                        >
                            {t.adminAppTradingSessionsRetry}
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminAppTradingSessionsEmpty}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {error ? (
                            <li className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                {error}
                            </li>
                        ) : null}
                        {filtered.map((row) => {
                            const theory = isTheory(row)
                            const title =
                                row.title?.trim() || t.adminAppTradingSessionsNoTitle
                            return (
                                <li key={row.id}>
                                    <Link
                                        href={`/admin-app/trading-sessions/${encodeURIComponent(row.id)}`}
                                        className="block rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4 transition active:bg-white/[0.04]"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 text-sm font-semibold text-white">
                                                {title}
                                            </p>
                                            <span
                                                className={[
                                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    theory
                                                        ? "border-violet-400/35 bg-violet-500/15 text-violet-100"
                                                        : "border-sky-400/35 bg-sky-500/15 text-sky-100",
                                                ].join(" ")}
                                            >
                                                {theory
                                                    ? t.sessionTypeTheoryClass
                                                    : t.sessionTypeTradingSession}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">
                                            {row.date ?? "—"} · {formatTimeDisplay(row.time)}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {row.starts_soon ? (
                                                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                                                    {t.adminAppTradingSessionsStartsSoon}
                                                </span>
                                            ) : null}
                                            {row.is_live ? (
                                                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                                                    {t.adminAppTradingSessionsLive}
                                                </span>
                                            ) : null}
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}

                <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                    {t.adminAppTradingSessionsCapacityUnavailable}
                </p>
            </section>

            {createOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-trading-session-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="create-trading-session-title"
                            className="text-base font-bold text-white"
                        >
                            {createType === "theory"
                                ? t.createTheoryClassTitle
                                : t.createSessionTitle}
                        </h2>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                            {t.createSessionZoomNote}
                        </p>
                        <form className="mt-4 space-y-3" onSubmit={(e) => void handleCreate(e)}>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.sessionTypeLabel}
                                <select
                                    value={createType}
                                    disabled={createBusy}
                                    onChange={(e) =>
                                        setCreateType(
                                            e.target.value === "theory" ? "theory" : "trading"
                                        )
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                >
                                    <option value="trading">{t.sessionTypeTradingSession}</option>
                                    <option value="theory">{t.sessionTypeTheoryClass}</option>
                                </select>
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.dateLabel}
                                <input
                                    type="date"
                                    required
                                    value={createDate}
                                    disabled={createBusy}
                                    onChange={(e) => setCreateDate(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.timeLabel}
                                <input
                                    type="time"
                                    required
                                    value={createTime}
                                    disabled={createBusy}
                                    onChange={(e) => setCreateTime(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            {createError ? (
                                <p className="text-xs text-red-300">{createError}</p>
                            ) : null}
                            <button
                                type="submit"
                                disabled={createBusy}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                            >
                                {createBusy
                                    ? t.creating
                                    : createType === "theory"
                                      ? t.createTheoryClass
                                      : t.createSession}
                            </button>
                            <button
                                type="button"
                                disabled={createBusy}
                                onClick={closeCreate}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppTradingSessionsCancelAction}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
