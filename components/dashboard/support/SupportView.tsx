"use client"

import { listMySupportTicketsAction } from "@/app/actions/support"
import NewTicketModal from "@/components/dashboard/support/NewTicketModal"
import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import SupportTicketDetail from "@/components/dashboard/support/SupportTicketDetail"
import {
    formatSupportDate,
    supportCategoryLabel,
    supportPriorityBadgeClass,
    supportPriorityLabel,
    supportStatusBadgeClass,
    supportStatusLabel,
} from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import type { SupportTicket } from "@/lib/support/types"
import { LifeBuoy, Plus } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export default function SupportView() {
    const { t, language } = useLanguage()
    const [tickets, setTickets] = useState<SupportTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)

    const showToast = useCallback((message: string, tone: StudentToastTone) => {
        setToast({ message, tone })
    }, [])

    const loadTickets = useCallback(async () => {
        setLoading(true)
        setLoadError(false)
        try {
            const result = await listMySupportTicketsAction({})
            if (!result.ok) {
                setTickets([])
                setLoadError(true)
                return
            }
            setTickets(result.data)
        } catch {
            setTickets([])
            setLoadError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadTickets()
    }, [loadTickets])

    if (selectedTicketId) {
        return (
            <>
                <SupportTicketDetail
                    ticketId={selectedTicketId}
                    onBack={() => {
                        setSelectedTicketId(null)
                        void loadTickets()
                    }}
                    onSuccessToast={(msg) => showToast(msg, "success")}
                    onErrorToast={(msg) => showToast(msg, "error")}
                />
                {toast ? (
                    <StudentToast
                        message={toast.message}
                        tone={toast.tone}
                        onDismiss={() => setToast(null)}
                    />
                ) : null}
            </>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{t.supportTitle}</h2>
                    <p className="mt-1 text-white/60">{t.supportSubtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition hover:brightness-110"
                >
                    <Plus size={16} />
                    {t.supportNewTicket}
                </button>
            </header>

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm">
                {loading ? (
                    <p className="text-sm text-white/60">{t.supportLoading}</p>
                ) : loadError ? (
                    <div className="space-y-3">
                        <p className="text-sm text-red-300">{t.supportLoadError}</p>
                        <button
                            type="button"
                            onClick={() => void loadTickets()}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                            {t.supportRetry}
                        </button>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
                            <LifeBuoy size={22} />
                        </div>
                        <div className="font-extrabold text-slate-100">{t.supportEmptyTitle}</div>
                        <p className="max-w-md text-sm text-white/60">{t.supportEmptyDescription}</p>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-600/20 px-4 py-2 text-sm font-bold text-blue-200 transition hover:bg-blue-600/30"
                        >
                            <Plus size={16} />
                            {t.supportNewTicket}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-white/45">
                                    <th className="pb-3 pr-4 font-semibold">{t.supportSubject}</th>
                                    <th className="pb-3 pr-4 font-semibold">{t.supportCategory}</th>
                                    <th className="pb-3 pr-4 font-semibold">{t.supportStatus}</th>
                                    <th className="pb-3 pr-4 font-semibold">{t.supportPriority}</th>
                                    <th className="pb-3 font-semibold">{t.supportDate}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                    >
                                        <td className="py-3.5 pr-4 font-semibold text-slate-100">
                                            {ticket.subject}
                                        </td>
                                        <td className="py-3.5 pr-4 text-slate-300">
                                            {supportCategoryLabel(t, ticket.category)}
                                        </td>
                                        <td className="py-3.5 pr-4">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${supportStatusBadgeClass(ticket.status)}`}
                                            >
                                                {supportStatusLabel(t, ticket.status)}
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-4">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${supportPriorityBadgeClass(ticket.priority)}`}
                                            >
                                                {supportPriorityLabel(t, ticket.priority)}
                                            </span>
                                        </td>
                                        <td className="py-3.5 text-slate-400">
                                            {formatSupportDate(ticket.created_at, language)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <NewTicketModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={() => void loadTickets()}
                onSuccessToast={(msg) => showToast(msg, "success")}
                onErrorToast={(msg) => showToast(msg, "error")}
            />

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
