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
    type SupportMessage,
    type SupportTicketStatus,
    type SupportTicketWithMessages,
} from "@/lib/support/types"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FormEvent, useCallback, useEffect, useState } from "react"

type DetailPayload = {
    ok?: unknown
    data?: SupportTicketWithMessages
    error?: string
    code?: string
}

type MutationPayload = {
    ok?: unknown
    data?: unknown
    error?: string
    code?: string
}

function isSupportTicketStatus(value: string): value is SupportTicketStatus {
    return (SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)
}

function messageBubbleClass(message: SupportMessage): string {
    if (message.is_internal) {
        return "border-amber-400/25 bg-amber-500/10"
    }
    if (message.sender_type === "admin") {
        return "border-blue-400/25 bg-blue-500/10"
    }
    if (message.sender_type === "student") {
        return "border-white/[0.08] bg-white/[0.04]"
    }
    return "border-white/[0.06] bg-white/[0.02]"
}

export default function AdminAppSupportTicketClient({ ticketId }: { ticketId: string }) {
    const { t, language } = useLanguage()
    const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [replyBody, setReplyBody] = useState("")
    const [replyError, setReplyError] = useState<string | null>(null)
    const [replyBusy, setReplyBusy] = useState(false)
    const [statusBusy, setStatusBusy] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/support/admin/tickets/${encodeURIComponent(ticketId)}`,
                {
                    cache: "no-store",
                    credentials: "include",
                }
            )
            const payload = (await res.json().catch(() => ({}))) as DetailPayload
            if (!res.ok || payload.ok !== true || !payload.data) {
                throw new Error(
                    typeof payload.error === "string" ? payload.error : t.adminSupportLoadError
                )
            }
            const messages = Array.isArray(payload.data.messages)
                ? [...payload.data.messages].sort(
                      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
                  )
                : []
            setTicket({ ...payload.data, messages })
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminSupportLoadError)
            setTicket(null)
        } finally {
            setLoading(false)
        }
    }, [ticketId, t.adminSupportLoadError])

    useEffect(() => {
        void load()
    }, [load])

    const closed = ticket?.status === "closed"

    const handleStatusChange = async (nextStatus: SupportTicketStatus) => {
        if (!ticket || statusBusy || nextStatus === ticket.status) return
        setStatusBusy(true)
        setStatusMessage(null)
        setError(null)
        try {
            const res = await fetch(
                `/api/support/admin/tickets/${encodeURIComponent(ticketId)}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: nextStatus }),
                }
            )
            const payload = (await res.json().catch(() => ({}))) as MutationPayload & {
                data?: {
                    id?: string
                    status?: string
                    priority?: string
                    category?: string
                    assigned_admin_email?: string | null
                    last_message_at?: string
                    updated_at?: string
                    closed_at?: string | null
                }
            }
            if (!res.ok || payload.ok !== true) {
                throw new Error(
                    typeof payload.error === "string"
                        ? payload.error
                        : t.adminSupportUpdateError
                )
            }
            const updated = payload.data
            if (updated && typeof updated.status === "string" && isSupportTicketStatus(updated.status)) {
                const nextStatus = updated.status
                setTicket((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: nextStatus,
                              closed_at:
                                  typeof updated.closed_at === "string" || updated.closed_at === null
                                      ? updated.closed_at
                                      : prev.closed_at,
                              updated_at:
                                  typeof updated.updated_at === "string"
                                      ? updated.updated_at
                                      : prev.updated_at,
                              last_message_at:
                                  typeof updated.last_message_at === "string"
                                      ? updated.last_message_at
                                      : prev.last_message_at,
                          }
                        : prev
                )
            }
            setStatusMessage(t.adminAppSupportStatusUpdated)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminSupportUpdateError)
        } finally {
            setStatusBusy(false)
        }
    }

    const handleReply = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!ticket || replyBusy) return
        const body = replyBody.trim()
        if (!body) {
            setReplyError(t.adminAppSupportReplyEmpty)
            return
        }
        if (ticket.status === "closed") {
            setReplyError(t.adminSupportTicketClosedHint)
            return
        }
        setReplyBusy(true)
        setReplyError(null)
        setError(null)
        try {
            const res = await fetch(
                `/api/support/admin/tickets/${encodeURIComponent(ticketId)}/messages`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body }),
                }
            )
            const payload = (await res.json().catch(() => ({}))) as MutationPayload
            if (!res.ok || payload.ok !== true) {
                if (payload.code === "ticket_closed" || res.status === 409) {
                    throw new Error(t.adminSupportTicketClosedHint)
                }
                throw new Error(
                    typeof payload.error === "string"
                        ? payload.error
                        : t.adminSupportReplyError
                )
            }
            setReplyBody("")
            await load()
        } catch (e) {
            setReplyError(e instanceof Error ? e.message : t.adminSupportReplyError)
        } finally {
            setReplyBusy(false)
        }
    }

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.16),transparent_42%)]"
            />

            <header className="relative z-10 mb-4 pr-[5.5rem]">
                <Link
                    href="/admin-app/support"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppSupportBackList}
                </Link>
            </header>

            {loading ? (
                <p className="relative z-10 rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                    {t.adminSupportLoading}
                </p>
            ) : error && !ticket ? (
                <div className="relative z-10 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                    <p className="text-sm text-red-200">{error}</p>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                    >
                        {t.adminSupportRetry}
                    </button>
                </div>
            ) : ticket ? (
                <div className="relative z-10 flex flex-col gap-4">
                    {error ? (
                        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                            {error}
                        </p>
                    ) : null}

                    <section className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <h1 className="text-lg font-bold tracking-tight text-white">
                            {ticket.subject}
                        </h1>
                        <p className="mt-1 truncate text-sm text-slate-400">
                            {ticket.student_email}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span
                                className={[
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    supportStatusBadgeClass(
                                        isSupportTicketStatus(ticket.status)
                                            ? ticket.status
                                            : "open"
                                    ),
                                ].join(" ")}
                            >
                                {supportStatusLabel(
                                    t,
                                    isSupportTicketStatus(ticket.status)
                                        ? ticket.status
                                        : "open"
                                )}
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
                    </section>

                    <section className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t.adminSupportChangeStatus}
                        </label>
                        <select
                            value={ticket.status}
                            disabled={statusBusy}
                            onChange={(e) => {
                                const value = e.target.value
                                if (isSupportTicketStatus(value)) {
                                    void handleStatusChange(value)
                                }
                            }}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                        >
                            {SUPPORT_TICKET_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {supportStatusLabel(t, status)}
                                </option>
                            ))}
                        </select>
                        {statusBusy ? (
                            <p className="mt-2 text-xs text-slate-500">
                                {t.adminAppSupportStatusUpdating}
                            </p>
                        ) : null}
                        {statusMessage ? (
                            <p className="mt-2 text-xs text-emerald-300">{statusMessage}</p>
                        ) : null}
                    </section>

                    <section className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <h2 className="text-sm font-semibold text-white">
                            {t.adminSupportConversation}
                        </h2>
                        <ul className="mt-3 space-y-3">
                            {ticket.messages.length === 0 ? (
                                <li className="text-sm text-slate-500">{t.adminSupportEmpty}</li>
                            ) : (
                                ticket.messages.map((message) => (
                                    <li
                                        key={message.id}
                                        className={[
                                            "rounded-xl border px-3 py-2.5",
                                            messageBubbleClass(message),
                                        ].join(" ")}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-semibold text-slate-300">
                                                {message.sender_type === "admin"
                                                    ? t.adminLabel
                                                    : message.sender_type === "student"
                                                      ? t.adminSupportColStudent
                                                      : message.sender_type}
                                            </span>
                                            {message.is_internal ? (
                                                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                                                    {t.adminSupportInternalBadge}
                                                </span>
                                            ) : null}
                                            <span className="text-[10px] text-slate-500">
                                                {formatSupportDate(message.created_at, language)}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-100">
                                            {message.body}
                                        </p>
                                    </li>
                                ))
                            )}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <h2 className="text-sm font-semibold text-white">
                            {t.adminSupportReplyPublic}
                        </h2>
                        {closed ? (
                            <p className="mt-2 text-sm text-amber-200/90">
                                {t.adminSupportTicketClosedHint}
                            </p>
                        ) : (
                            <form className="mt-3 space-y-3" onSubmit={(e) => void handleReply(e)}>
                                <textarea
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    rows={4}
                                    placeholder={t.adminSupportReplyPlaceholder}
                                    disabled={replyBusy}
                                    className="w-full resize-y rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400/40 disabled:opacity-50"
                                />
                                {replyError ? (
                                    <p className="text-xs text-red-300">{replyError}</p>
                                ) : null}
                                <button
                                    type="submit"
                                    disabled={replyBusy}
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                                >
                                    {replyBusy ? t.adminSupportSending : t.adminSupportSend}
                                </button>
                            </form>
                        )}
                    </section>
                </div>
            ) : null}
        </div>
    )
}
