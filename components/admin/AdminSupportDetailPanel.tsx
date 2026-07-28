"use client"

import {
    addAdminSupportMessageAction,
    getAdminSupportStudentProfileAction,
    getAdminSupportTicketAction,
    updateAdminSupportTicketAction,
} from "@/app/actions/support"
import {
    formatSupportDate,
    supportCategoryLabel,
    supportPriorityBadgeClass,
    supportPriorityLabel,
    supportStatusBadgeClass,
    supportStatusLabel,
} from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import { ADMIN_EMAILS } from "@/lib/adminEmails"
import {
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_STATUSES,
    type SupportStudentProfile,
    type SupportTicket,
    type SupportTicketPriority,
    type SupportTicketStatus,
    type SupportTicketWithMessages,
} from "@/lib/support"
import { X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type AdminSupportDetailPanelProps = {
    ticketId: string
    adminEmail: string
    onClose: () => void
    onTicketUpdated: (ticket: SupportTicket) => void
    onSuccessToast: (message: string) => void
    onErrorToast: (message: string) => void
}

export default function AdminSupportDetailPanel({
    ticketId,
    adminEmail,
    onClose,
    onTicketUpdated,
    onSuccessToast,
    onErrorToast,
}: AdminSupportDetailPanelProps) {
    const { t, language } = useLanguage()
    const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null)
    const [student, setStudent] = useState<SupportStudentProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [studentLoading, setStudentLoading] = useState(false)
    const [status, setStatus] = useState<SupportTicketStatus>("open")
    const [priority, setPriority] = useState<SupportTicketPriority>("normal")
    const [assignee, setAssignee] = useState("")
    const [savingMeta, setSavingMeta] = useState(false)
    const [replyMode, setReplyMode] = useState<"public" | "internal">("public")
    const [replyBody, setReplyBody] = useState("")
    const [sending, setSending] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getAdminSupportTicketAction(ticketId)
            if (!result.ok) {
                onErrorToast(result.error || t.adminSupportLoadError)
                setTicket(null)
                return
            }
            setTicket(result.data)
            setStatus(result.data.status)
            setPriority(result.data.priority)
            setAssignee(result.data.assigned_admin_email ?? "")

            setStudentLoading(true)
            const profile = await getAdminSupportStudentProfileAction(result.data.student_email)
            setStudent(profile.ok ? profile.data : null)
        } catch {
            onErrorToast(t.adminSupportLoadError)
            setTicket(null)
        } finally {
            setLoading(false)
            setStudentLoading(false)
        }
    }, [ticketId, onErrorToast, t])

    useEffect(() => {
        void load()
    }, [load])

    const handleSaveMeta = async () => {
        if (!ticket || savingMeta) return
        setSavingMeta(true)
        try {
            const result = await updateAdminSupportTicketAction(ticket.id, {
                status,
                priority,
                assignedAdminEmail: assignee.trim() ? assignee.trim().toLowerCase() : null,
            })
            if (!result.ok) {
                onErrorToast(result.error || t.adminSupportUpdateError)
                return
            }
            setTicket((prev) => (prev ? { ...prev, ...result.data } : prev))
            onTicketUpdated(result.data)
            onSuccessToast(t.adminSupportUpdateSuccess)
        } catch {
            onErrorToast(t.adminSupportUpdateError)
        } finally {
            setSavingMeta(false)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ticket || !replyBody.trim() || sending) return

        const isInternal = replyMode === "internal"
        if (!isInternal && ticket.status === "closed") {
            onErrorToast(t.adminSupportTicketClosedHint)
            return
        }

        setSending(true)
        try {
            const result = await addAdminSupportMessageAction(ticket.id, {
                body: replyBody.trim(),
                isInternal,
                nextStatus: isInternal ? undefined : "waiting_student",
            })
            if (!result.ok) {
                onErrorToast(result.error || t.adminSupportReplyError)
                return
            }
            setReplyBody("")
            onTicketUpdated(result.data.ticket)
            onSuccessToast(t.adminSupportReplySuccess)
            await load()
        } catch {
            onErrorToast(t.adminSupportReplyError)
        } finally {
            setSending(false)
        }
    }

    const studentName = student
        ? [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || "—"
        : "—"

    return (
        <div className="fixed inset-0 z-[70] flex justify-end">
            <button
                type="button"
                aria-label={t.adminSupportClosePanel}
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-support-detail-title"
                className="relative z-10 flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0B1120] shadow-[-24px_0_48px_rgba(0,0,0,0.45)]"
            >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <h2 id="admin-support-detail-title" className="text-lg font-extrabold text-slate-50">
                        {t.adminSupportDetailTitle}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                        aria-label={t.adminSupportClosePanel}
                    >
                        <X size={16} />
                    </button>
                </div>

                {loading || !ticket ? (
                    <div className="p-6 text-sm text-white/60">{t.adminSupportLoading}</div>
                ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.4fr_0.9fr]">
                        <div className="min-h-0 overflow-y-auto border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
                                        {ticket.id.slice(0, 8)}
                                    </div>
                                    <h3 className="mt-1 text-xl font-extrabold text-slate-50">{ticket.subject}</h3>
                                    <div className="mt-3 flex flex-wrap gap-2">
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
                                </div>

                                <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
                                    <label className="block text-xs">
                                        <span className="mb-1.5 block font-medium text-slate-400">
                                            {t.adminSupportChangeStatus}
                                        </span>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as SupportTicketStatus)}
                                            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-2.5 py-2 text-sm text-white"
                                        >
                                            {SUPPORT_TICKET_STATUSES.map((s) => (
                                                <option key={s} value={s}>
                                                    {supportStatusLabel(t, s)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-xs">
                                        <span className="mb-1.5 block font-medium text-slate-400">
                                            {t.adminSupportChangePriority}
                                        </span>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                                            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-2.5 py-2 text-sm text-white"
                                        >
                                            {SUPPORT_TICKET_PRIORITIES.map((p) => (
                                                <option key={p} value={p}>
                                                    {supportPriorityLabel(t, p)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-xs">
                                        <span className="mb-1.5 block font-medium text-slate-400">
                                            {t.adminSupportAssign}
                                        </span>
                                        <select
                                            value={assignee}
                                            onChange={(e) => setAssignee(e.target.value)}
                                            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-2.5 py-2 text-sm text-white"
                                        >
                                            <option value="">{t.adminSupportUnassigned}</option>
                                            {ADMIN_EMAILS.map((email) => (
                                                <option key={email} value={email}>
                                                    {email}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAssignee(adminEmail)}
                                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                                    >
                                        {t.adminSupportAssignToMe}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={savingMeta}
                                        onClick={() => void handleSaveMeta()}
                                        className="rounded-lg border border-blue-300/30 bg-blue-600/20 px-3 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-600/30 disabled:opacity-60"
                                    >
                                        {savingMeta ? t.adminSupportSaving : t.adminSupportSaveChanges}
                                    </button>
                                </div>

                                <div>
                                    <h4 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white/50">
                                        {t.adminSupportConversation}
                                    </h4>
                                    <div className="mt-3 space-y-3">
                                        {ticket.messages.map((msg) => {
                                            const isStudent = msg.sender_type === "student"
                                            const isInternal = msg.is_internal
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={[
                                                        "rounded-xl border px-4 py-3",
                                                        isInternal
                                                            ? "border-amber-400/25 bg-amber-500/10"
                                                            : isStudent
                                                              ? "border-blue-400/20 bg-blue-500/10"
                                                              : "border-white/10 bg-white/5",
                                                    ].join(" ")}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-extrabold text-slate-200">
                                                                {isStudent
                                                                    ? ticket.student_email
                                                                    : msg.sender_email}
                                                            </span>
                                                            {isInternal ? (
                                                                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                                                                    {t.adminSupportInternalBadge}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <span className="text-xs text-white/40">
                                                            {formatSupportDate(msg.created_at, language)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                                                        {msg.body}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <form onSubmit={(e) => void handleSend(e)} className="space-y-3 border-t border-white/10 pt-4">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setReplyMode("public")}
                                            className={[
                                                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                                replyMode === "public"
                                                    ? "border-blue-400/40 bg-blue-500/20 text-blue-100"
                                                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                                            ].join(" ")}
                                        >
                                            {t.adminSupportReplyPublic}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReplyMode("internal")}
                                            className={[
                                                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                                replyMode === "internal"
                                                    ? "border-amber-400/40 bg-amber-500/20 text-amber-100"
                                                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                                            ].join(" ")}
                                        >
                                            {t.adminSupportReplyInternal}
                                        </button>
                                    </div>
                                    {ticket.status === "closed" && replyMode === "public" ? (
                                        <p className="text-xs text-amber-200/90">{t.adminSupportTicketClosedHint}</p>
                                    ) : null}
                                    <textarea
                                        rows={4}
                                        value={replyBody}
                                        onChange={(e) => setReplyBody(e.target.value)}
                                        placeholder={
                                            replyMode === "internal"
                                                ? t.adminSupportInternalPlaceholder
                                                : t.adminSupportReplyPlaceholder
                                        }
                                        disabled={sending}
                                        className="w-full resize-y rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={sending || !replyBody.trim()}
                                            className="rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                                        >
                                            {sending ? t.adminSupportSending : t.adminSupportSend}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="min-h-0 overflow-y-auto p-5">
                            <h4 className="text-sm font-extrabold text-slate-50">{t.adminSupportStudentInfo}</h4>
                            {studentLoading ? (
                                <p className="mt-3 text-sm text-white/50">{t.adminSupportStudentLoading}</p>
                            ) : !student ? (
                                <p className="mt-3 text-sm text-white/50">{t.adminSupportStudentNotFound}</p>
                            ) : (
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentName}</dt>
                                        <dd className="mt-0.5 font-semibold text-slate-100">{studentName}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentEmail}</dt>
                                        <dd className="mt-0.5 break-all text-slate-200">{student.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentPhone}</dt>
                                        <dd className="mt-0.5 text-slate-200">{student.phone || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentAccess}</dt>
                                        <dd className="mt-0.5 text-slate-200">{student.access_type || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.activeLabel}</dt>
                                        <dd className="mt-0.5 text-slate-200">
                                            {student.is_active === false
                                                ? t.adminSupportStudentInactive
                                                : t.adminSupportStudentActive}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentSubscription}</dt>
                                        <dd className="mt-0.5 text-slate-200">
                                            {student.subscription_status || "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentExpires}</dt>
                                        <dd className="mt-0.5 text-slate-200">
                                            {student.access_expires_at
                                                ? formatSupportDate(student.access_expires_at, language)
                                                : "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-white/45">{t.adminSupportStudentProfile}</dt>
                                        <dd className="mt-0.5 text-slate-200">
                                            {student.profile_completed
                                                ? t.adminSupportStudentYes
                                                : t.adminSupportStudentNo}
                                        </dd>
                                    </div>
                                </dl>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    )
}
