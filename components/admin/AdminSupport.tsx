"use client"

import {
    getAdminSupportStatusCountsAction,
    listAdminSupportTicketsAction,
} from "@/app/actions/support"
import AdminSupportDetailPanel from "@/components/admin/AdminSupportDetailPanel"
import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import {
    formatSupportDate,
    supportCategoryLabel,
    supportPriorityBadgeClass,
    supportPriorityLabel,
    supportStatusBadgeClass,
    supportStatusLabel,
} from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import {
    SUPPORT_TICKET_CATEGORIES,
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_STATUSES,
    type SupportTicket,
    type SupportTicketCategory,
    type SupportTicketPriority,
    type SupportTicketStatus,
    type SupportTicketStatusCounts,
} from "@/lib/support"
import { useCallback, useEffect, useMemo, useState } from "react"

type AdminSupportProps = {
    onOpenCountChange?: (openCount: number) => void
}

export default function AdminSupport({ onOpenCountChange }: AdminSupportProps) {
    const { t, language } = useLanguage()
    const [tickets, setTickets] = useState<SupportTicket[]>([])
    const [counts, setCounts] = useState<SupportTicketStatusCounts>({
        open: 0,
        in_progress: 0,
        waiting_student: 0,
        closed: 0,
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "">("")
    const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority | "">("")
    const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategory | "">("")
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [adminEmail, setAdminEmail] = useState("")
    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)

    const showToast = useCallback((message: string, tone: StudentToastTone) => {
        setToast({ message, tone })
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const [listResult, countsResult] = await Promise.all([
                listAdminSupportTicketsAction({ limit: 100, offset: 0 }),
                getAdminSupportStatusCountsAction(),
            ])
            if (!listResult.ok) {
                setTickets([])
                setError(true)
            } else {
                setTickets(listResult.data)
            }
            if (countsResult.ok) {
                setCounts(countsResult.data)
                onOpenCountChange?.(countsResult.data.open)
            }
        } catch {
            setTickets([])
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [onOpenCountChange])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        let cancelled = false
        void (async () => {
            // Client cannot call getAuthorizedAdminEmailFromCookies (server-only).
            // Infer from cookie mirror used elsewhere in admin UI.
            if (typeof document === "undefined") return
            const key = "ta_student_email="
            const hit = document.cookie
                .split(";")
                .map((p) => p.trim())
                .find((p) => p.startsWith(key))
            if (!hit || cancelled) return
            const email = decodeURIComponent(hit.slice(key.length)).trim().toLowerCase()
            if (email) setAdminEmail(email)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return tickets.filter((ticket) => {
            if (statusFilter && ticket.status !== statusFilter) return false
            if (priorityFilter && ticket.priority !== priorityFilter) return false
            if (categoryFilter && ticket.category !== categoryFilter) return false
            if (!q) return true
            return (
                ticket.subject.toLowerCase().includes(q) ||
                ticket.student_email.toLowerCase().includes(q) ||
                ticket.id.toLowerCase().includes(q)
            )
        })
    }, [tickets, search, statusFilter, priorityFilter, categoryFilter])

    const statCards = [
        { key: "open" as const, label: t.adminSupportOpen, value: counts.open, accent: "border-blue-400/25 bg-blue-500/10" },
        {
            key: "in_progress" as const,
            label: t.adminSupportInProgress,
            value: counts.in_progress,
            accent: "border-amber-400/25 bg-amber-500/10",
        },
        {
            key: "waiting_student" as const,
            label: t.adminSupportWaiting,
            value: counts.waiting_student,
            accent: "border-violet-400/25 bg-violet-500/10",
        },
        {
            key: "closed" as const,
            label: t.adminSupportClosed,
            value: counts.closed,
            accent: "border-slate-400/20 bg-white/5",
        },
    ]

    return (
        <div className="space-y-6">
            <p className="text-sm text-white/60">{t.adminSupportSubtitle}</p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statCards.map((card) => (
                    <button
                        key={card.key}
                        type="button"
                        onClick={() =>
                            setStatusFilter((prev) => (prev === card.key ? "" : card.key))
                        }
                        className={`rounded-2xl border p-4 text-left transition hover:brightness-110 ${card.accent} ${
                            statusFilter === card.key ? "ring-1 ring-blue-400/40" : ""
                        }`}
                    >
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                            {card.label}
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-slate-50">{card.value}</div>
                    </button>
                ))}
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-sm sm:p-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t.adminSupportSearch}
                        className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <label className="block">
                        <span className="sr-only">{t.adminSupportFilterStatus}</span>
                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter((e.target.value || "") as SupportTicketStatus | "")
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                        >
                            <option value="">{t.adminSupportAllStatuses}</option>
                            {SUPPORT_TICKET_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {supportStatusLabel(t, s)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="sr-only">{t.adminSupportFilterPriority}</span>
                        <select
                            value={priorityFilter}
                            onChange={(e) =>
                                setPriorityFilter((e.target.value || "") as SupportTicketPriority | "")
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                        >
                            <option value="">{t.adminSupportAllPriorities}</option>
                            {SUPPORT_TICKET_PRIORITIES.map((p) => (
                                <option key={p} value={p}>
                                    {supportPriorityLabel(t, p)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="sr-only">{t.adminSupportFilterCategory}</span>
                        <select
                            value={categoryFilter}
                            onChange={(e) =>
                                setCategoryFilter((e.target.value || "") as SupportTicketCategory | "")
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                        >
                            <option value="">{t.adminSupportAllCategories}</option>
                            {SUPPORT_TICKET_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {supportCategoryLabel(t, c)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="mt-5 overflow-x-auto">
                    {loading ? (
                        <p className="text-sm text-white/60">{t.adminSupportLoading}</p>
                    ) : error ? (
                        <div className="space-y-3">
                            <p className="text-sm text-red-300">{t.adminSupportLoadError}</p>
                            <button
                                type="button"
                                onClick={() => void load()}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                            >
                                {t.adminSupportRetry}
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="py-8 text-center text-sm text-white/50">{t.adminSupportEmpty}</p>
                    ) : (
                        <table className="w-full min-w-[880px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-white/45">
                                    <th className="pb-3 pr-3 font-semibold">{t.adminSupportColTicket}</th>
                                    <th className="pb-3 pr-3 font-semibold">{t.adminSupportColStudent}</th>
                                    <th className="pb-3 pr-3 font-semibold">{t.adminSupportColSubject}</th>
                                    <th className="pb-3 pr-3 font-semibold">{t.adminSupportColCategory}</th>
                                    <th className="pb-3 pr-3 font-semibold">{t.adminSupportColPriority}</th>
                                    <th className="pb-3 pr-3 font-semibold">{t.adminSupportColStatus}</th>
                                    <th className="pb-3 font-semibold">{t.adminSupportColUpdated}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                                        onClick={() => setSelectedId(ticket.id)}
                                    >
                                        <td className="py-3.5 pr-3 font-mono text-xs text-slate-400">
                                            {ticket.id.slice(0, 8)}
                                        </td>
                                        <td className="py-3.5 pr-3 text-slate-300">{ticket.student_email}</td>
                                        <td className="py-3.5 pr-3 font-semibold text-slate-100">
                                            {ticket.subject}
                                        </td>
                                        <td className="py-3.5 pr-3 text-slate-300">
                                            {supportCategoryLabel(t, ticket.category)}
                                        </td>
                                        <td className="py-3.5 pr-3">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${supportPriorityBadgeClass(ticket.priority)}`}
                                            >
                                                {supportPriorityLabel(t, ticket.priority)}
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-3">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${supportStatusBadgeClass(ticket.status)}`}
                                            >
                                                {supportStatusLabel(t, ticket.status)}
                                            </span>
                                        </td>
                                        <td className="py-3.5 text-slate-400">
                                            {formatSupportDate(ticket.updated_at || ticket.last_message_at, language)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {selectedId ? (
                <AdminSupportDetailPanel
                    ticketId={selectedId}
                    adminEmail={adminEmail}
                    onClose={() => setSelectedId(null)}
                    onTicketUpdated={(updated) => {
                        setTickets((prev) =>
                            prev.map((row) => (row.id === updated.id ? updated : row))
                        )
                        void getAdminSupportStatusCountsAction().then((result) => {
                            if (result.ok) {
                                setCounts(result.data)
                                onOpenCountChange?.(result.data.open)
                            }
                        })
                    }}
                    onSuccessToast={(msg) => showToast(msg, "success")}
                    onErrorToast={(msg) => showToast(msg, "error")}
                />
            ) : null}

            {toast ? (
                <StudentToast
                    message={toast.message}
                    tone={toast.tone}
                    onDismiss={() => setToast(null)}
                />
            ) : null}
        </div>
    )
}
