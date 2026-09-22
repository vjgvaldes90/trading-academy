"use client"

import {
    formatSupportDate,
    supportPriorityBadgeClass,
    supportPriorityLabel,
    supportStatusBadgeClass,
    supportStatusLabel,
} from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import {
    SUPPORT_TICKET_STATUSES,
    type SupportTicket,
    type SupportTicketStatus,
} from "@/lib/support/types"
import { ArrowLeft, LifeBuoy } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

const PAGE_SIZE = 50

type StatusFilter = "all" | SupportTicketStatus

type ListPayload = {
    ok?: unknown
    data?: SupportTicket[]
    error?: string
}

function isSupportTicketStatus(value: string): value is SupportTicketStatus {
    return (SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)
}

export default function AdminAppSupportClient() {
    const { t, language } = useLanguage()
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [items, setItems] = useState<SupportTicket[]>([])
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadPage = useCallback(
        async (nextOffset: number, replace: boolean) => {
            if (replace) {
                setLoading(true)
            } else {
                setLoadingMore(true)
            }
            setError(null)
            try {
                const params = new URLSearchParams({
                    limit: String(PAGE_SIZE),
                    offset: String(nextOffset),
                })
                if (statusFilter !== "all") {
                    params.set("status", statusFilter)
                }
                const res = await fetch(`/api/support/admin/tickets?${params.toString()}`, {
                    cache: "no-store",
                    credentials: "include",
                })
                const payload = (await res.json().catch(() => ({}))) as ListPayload
                if (!res.ok || payload.ok !== true) {
                    throw new Error(
                        typeof payload.error === "string" ? payload.error : t.adminSupportLoadError
                    )
                }
                const rows = Array.isArray(payload.data) ? payload.data : []
                setItems((prev) => (replace ? rows : [...prev, ...rows]))
                setOffset(nextOffset + rows.length)
                setHasMore(rows.length >= PAGE_SIZE)
            } catch (e) {
                setError(e instanceof Error ? e.message : t.adminSupportLoadError)
                if (replace) setItems([])
            } finally {
                setLoading(false)
                setLoadingMore(false)
            }
        },
        [statusFilter, t.adminSupportLoadError]
    )

    useEffect(() => {
        setOffset(0)
        setHasMore(false)
        void loadPage(0, true)
    }, [loadPage])

    const filters: { id: StatusFilter; label: string }[] = [
        { id: "all", label: t.adminAppSupportFilterAll },
        { id: "open", label: t.adminSupportOpen },
        { id: "in_progress", label: t.adminSupportInProgress },
        { id: "waiting_student", label: t.adminSupportWaiting },
        { id: "closed", label: t.adminSupportClosed },
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
                    {t.adminAppSupportBackHome}
                </Link>

                <div className="mt-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-blue-300">
                        <LifeBuoy className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {t.adminAppSupportTitle}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            {t.adminAppSupportSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            <div className="relative z-10 -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {filters.map((f) => {
                    const active = statusFilter === f.id
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setStatusFilter(f.id)}
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
                {loading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminSupportLoading}
                    </p>
                ) : error && items.length === 0 ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                        <p className="text-sm text-red-200">{error}</p>
                        <button
                            type="button"
                            onClick={() => void loadPage(0, true)}
                            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                        >
                            {t.adminSupportRetry}
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminSupportEmpty}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {error ? (
                            <li className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                {error}
                            </li>
                        ) : null}
                        {items.map((ticket) => {
                            const closed = ticket.status === "closed"
                            const status = isSupportTicketStatus(ticket.status)
                                ? ticket.status
                                : "open"
                            return (
                                <li key={ticket.id}>
                                    <Link
                                        href={`/admin-app/support/${encodeURIComponent(ticket.id)}`}
                                        className={[
                                            "block rounded-2xl border bg-[#111827]/95 p-4 transition active:bg-white/[0.04]",
                                            closed
                                                ? "border-white/[0.06] opacity-80"
                                                : "border-white/[0.08]",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 text-sm font-semibold text-white">
                                                {ticket.subject}
                                            </p>
                                            {closed ? (
                                                <span className="shrink-0 rounded-full border border-slate-400/25 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    {t.adminSupportClosed}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-slate-400">
                                            {ticket.student_email}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={[
                                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    supportStatusBadgeClass(status),
                                                ].join(" ")}
                                            >
                                                {supportStatusLabel(t, status)}
                                            </span>
                                            <span
                                                className={[
                                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    supportPriorityBadgeClass(ticket.priority),
                                                ].join(" ")}
                                            >
                                                {supportPriorityLabel(t, ticket.priority)}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-[11px] text-slate-500">
                                            {formatSupportDate(ticket.last_message_at, language)}
                                        </p>
                                    </Link>
                                </li>
                            )
                        })}
                        {hasMore ? (
                            <li className="pt-1 text-center">
                                <button
                                    type="button"
                                    disabled={loadingMore}
                                    onClick={() => void loadPage(offset, false)}
                                    className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition active:bg-white/[0.06] disabled:opacity-50"
                                >
                                    {loadingMore ? t.loading : t.adminAppSupportLoadMore}
                                </button>
                            </li>
                        ) : null}
                    </ul>
                )}
            </section>
        </div>
    )
}
