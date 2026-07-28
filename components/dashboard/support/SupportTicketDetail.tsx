"use client"

import {
    addMySupportMessageAction,
    getMySupportTicketAction,
} from "@/app/actions/support"
import { useLanguage } from "@/context/LanguageProvider"
import type { SupportTicketWithMessages } from "@/lib/support/types"
import {
    formatSupportDate,
    supportCategoryLabel,
    supportPriorityBadgeClass,
    supportPriorityLabel,
    supportStatusBadgeClass,
    supportStatusLabel,
} from "@/components/dashboard/support/supportLabels"
import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type SupportTicketDetailProps = {
    ticketId: string
    onBack: () => void
    onSuccessToast: (message: string) => void
    onErrorToast: (message: string) => void
}

export default function SupportTicketDetail({
    ticketId,
    onBack,
    onSuccessToast,
    onErrorToast,
}: SupportTicketDetailProps) {
    const { t, language } = useLanguage()
    const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [reply, setReply] = useState("")
    const [sending, setSending] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError(false)
        try {
            const result = await getMySupportTicketAction(ticketId)
            if (!result.ok) {
                setTicket(null)
                setLoadError(true)
                return
            }
            setTicket(result.data)
        } catch {
            setTicket(null)
            setLoadError(true)
        } finally {
            setLoading(false)
        }
    }, [ticketId])

    useEffect(() => {
        void load()
    }, [load])

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault()
        const body = reply.trim()
        if (!body || sending) return

        setSending(true)
        try {
            const result = await addMySupportMessageAction(ticketId, { body })
            if (!result.ok) {
                onErrorToast(result.error || t.supportReplyError)
                return
            }
            setReply("")
            onSuccessToast(t.supportReplySuccess)
            await load()
        } catch {
            onErrorToast(t.supportReplyError)
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-sm text-white/60">
                {t.supportLoading}
            </div>
        )
    }

    if (loadError || !ticket) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:text-blue-200"
                >
                    <ArrowLeft size={16} />
                    {t.supportBackToList}
                </button>
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
                    {t.supportTicketNotFound}
                </div>
            </div>
        )
    }

    const closed = ticket.status === "closed"
    const messages = ticket.messages.filter((m) => !m.is_internal)

    return (
        <div className="space-y-6">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:text-blue-200"
            >
                <ArrowLeft size={16} />
                {t.supportBackToList}
            </button>

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-50">{ticket.subject}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                    <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${supportStatusBadgeClass(ticket.status)}`}
                    >
                        {supportStatusLabel(t, ticket.status)}
                    </span>
                    <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${supportPriorityBadgeClass(ticket.priority)}`}
                    >
                        {supportPriorityLabel(t, ticket.priority)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {supportCategoryLabel(t, ticket.category)}
                    </span>
                </div>
                <p className="mt-3 text-sm text-white/50">
                    {t.supportDate}: {formatSupportDate(ticket.created_at, language)}
                </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white/60">
                    {t.supportConversation}
                </h3>
                <div className="mt-4 space-y-3">
                    {messages.length === 0 ? (
                        <p className="text-sm text-white/50">{t.supportNoMessages}</p>
                    ) : (
                        messages.map((msg) => {
                            const isStudent = msg.sender_type === "student"
                            return (
                                <div
                                    key={msg.id}
                                    className={[
                                        "rounded-xl border px-4 py-3",
                                        isStudent
                                            ? "border-blue-400/20 bg-blue-500/10"
                                            : "border-white/10 bg-white/5",
                                    ].join(" ")}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-extrabold text-slate-200">
                                            {isStudent ? t.supportYou : t.supportSupportTeam}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {formatSupportDate(msg.created_at, language)}
                                        </span>
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                                        {msg.body}
                                    </p>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-50">{t.supportReply}</h3>
                {closed ? (
                    <p className="mt-3 text-sm text-white/50">{t.supportTicketClosed}</p>
                ) : (
                    <form onSubmit={(e) => void handleReply(e)} className="mt-3 space-y-3">
                        <textarea
                            rows={4}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder={t.supportReplyPlaceholder}
                            disabled={sending}
                            className="w-full resize-y rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={sending || !reply.trim()}
                                className="rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sending ? t.supportSending : t.supportSendReply}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    )
}
