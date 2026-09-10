"use client"

import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import {
    formatPrivateClassPriceCents,
    formatPrivateClassTime,
    privateClassStatusBadgeClass,
    privateClassStatusLabel,
} from "@/components/dashboard/privateClassLabels"
import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import DateTimeField from "@/components/shared/DateTimeField"
import { useLanguage } from "@/context/LanguageProvider"
import {
    type PrivateClassRequestRow,
    type PrivateClassStatus,
} from "@/lib/privateClassRequests"
import { useCallback, useEffect, useMemo, useState } from "react"

type StatusFilter = "" | PrivateClassStatus
type ConfirmAction = "approve" | "cancel" | null

export default function AdminPrivateClassRequests() {
    const { t } = useLanguage()
    const [requests, setRequests] = useState<PrivateClassRequestRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("")
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
    const [confirmTarget, setConfirmTarget] = useState<PrivateClassRequestRow | null>(null)
    const [rejectTarget, setRejectTarget] = useState<PrivateClassRequestRow | null>(null)
    const [rejectNotes, setRejectNotes] = useState("")
    const [rejectSubmitting, setRejectSubmitting] = useState(false)
    const [rejectError, setRejectError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)
    const [ensuringZoomId, setEnsuringZoomId] = useState<string | null>(null)
    const [rescheduleTarget, setRescheduleTarget] = useState<PrivateClassRequestRow | null>(null)
    const [rescheduleDate, setRescheduleDate] = useState("")
    const [rescheduleTime, setRescheduleTime] = useState("")
    const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
    const [rescheduleError, setRescheduleError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""
            const res = await fetch(`/api/admin/private-class-requests${qs}`, {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as {
                requests?: PrivateClassRequestRow[]
                error?: string
            }
            if (!res.ok) {
                setRequests([])
                setError(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminPrivateClassLoadError
                )
                return
            }
            setRequests(Array.isArray(payload.requests) ? payload.requests : [])
        } catch {
            setRequests([])
            setError(t.adminPrivateClassLoadError)
        } finally {
            setLoading(false)
        }
    }, [statusFilter, t])

    useEffect(() => {
        void load()
    }, [load])

    const filterButtons = useMemo(
        () =>
            [
                { value: "" as const, label: t.adminPrivateClassFilterAll },
                { value: "pending" as const, label: t.adminPrivateClassFilterPending },
                {
                    value: "awaiting_payment" as const,
                    label: t.adminPrivateClassFilterAwaitingPayment,
                },
                { value: "paid" as const, label: t.adminPrivateClassFilterPaid },
                { value: "confirmed" as const, label: t.adminPrivateClassFilterConfirmed },
                { value: "completed" as const, label: t.adminPrivateClassFilterCompleted },
                { value: "rejected" as const, label: t.adminPrivateClassFilterRejected },
                { value: "cancelled" as const, label: t.adminPrivateClassFilterCancelled },
            ] as const,
        [t]
    )

    const patchAction = async (
        id: string,
        body: { action: "approve" | "reject" | "cancel"; admin_notes?: string | null }
    ) => {
        const res = await fetch(`/api/admin/private-class-requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
            body: JSON.stringify(body),
        })
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
            throw new Error(
                typeof payload.error === "string" && payload.error.trim()
                    ? payload.error
                    : t.adminPrivateClassActionError
            )
        }
    }

    const openConfirm = (action: "approve" | "cancel", row: PrivateClassRequestRow) => {
        setConfirmTarget(row)
        setConfirmAction(action)
    }

    const closeConfirm = () => {
        setConfirmTarget(null)
        setConfirmAction(null)
    }

    const openReschedule = (row: PrivateClassRequestRow) => {
        setRescheduleError(null)
        setRescheduleTarget(row)
        setRescheduleDate(String(row.requested_date ?? "").trim())
        const timeRaw = String(row.requested_time ?? "").trim()
        const tm = /^(\d{1,2}):(\d{2})/.exec(timeRaw)
        setRescheduleTime(tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : "")
    }

    const closeReschedule = () => {
        if (rescheduleSubmitting) return
        setRescheduleTarget(null)
        setRescheduleError(null)
        setRescheduleDate("")
        setRescheduleTime("")
    }

    const ensureZoom = async (row: PrivateClassRequestRow) => {
        if (ensuringZoomId) return
        setEnsuringZoomId(row.id)
        try {
            const res = await fetch(`/api/admin/private-class-requests/${row.id}/ensure-zoom`, {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            })
            const payload = (await res.json().catch(() => ({}))) as {
                ok?: boolean
                error?: string
            }
            if (!res.ok || payload.ok === false) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminPrivateClassEnsureZoomError
                )
            }
            setToast({ message: t.adminPrivateClassEnsureZoomSuccess, tone: "success" })
            await load()
        } catch (e) {
            setToast({
                message:
                    e instanceof Error && e.message.trim()
                        ? e.message
                        : t.adminPrivateClassEnsureZoomError,
                tone: "error",
            })
        } finally {
            setEnsuringZoomId(null)
        }
    }

    const submitReschedule = async () => {
        if (!rescheduleTarget || rescheduleSubmitting) return
        setRescheduleError(null)
        setRescheduleSubmitting(true)
        try {
            const res = await fetch(
                `/api/admin/private-class-requests/${rescheduleTarget.id}/reschedule`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({
                        requested_date: rescheduleDate.trim(),
                        requested_time: rescheduleTime.trim(),
                    }),
                }
            )
            const payload = (await res.json().catch(() => ({}))) as {
                ok?: boolean
                error?: string
                email_sent?: boolean
                warning?: string
            }
            if (!res.ok || payload.ok === false) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminPrivateClassRescheduleError
                )
            }
            setRescheduleTarget(null)
            setRescheduleDate("")
            setRescheduleTime("")
            if (payload.email_sent === false || payload.warning === "rescheduled_but_email_failed") {
                setToast({
                    message: t.adminPrivateClassRescheduleEmailWarning,
                    tone: "error",
                })
            } else {
                setToast({ message: t.adminPrivateClassRescheduleSuccess, tone: "success" })
            }
            await load()
        } catch (e) {
            setRescheduleError(
                e instanceof Error && e.message.trim()
                    ? e.message
                    : t.adminPrivateClassRescheduleError
            )
        } finally {
            setRescheduleSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-white/60">{t.adminPrivateClassSubtitle}</p>

            <div className="flex flex-wrap gap-2">
                {filterButtons.map((btn) => {
                    const active = statusFilter === btn.value
                    return (
                        <button
                            key={btn.value || "all"}
                            type="button"
                            onClick={() => setStatusFilter(btn.value)}
                            className={[
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                active
                                    ? "border-blue-400/40 bg-blue-500/20 text-blue-200"
                                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200",
                            ].join(" ")}
                        >
                            {btn.label}
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <p className="py-12 text-center text-sm text-slate-500">{t.adminPrivateClassLoading}</p>
            ) : error ? (
                <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                    <p className="text-sm text-red-300">{error}</p>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="mt-3 text-xs font-semibold text-red-200 underline"
                    >
                        {t.adminPrivateClassRetry}
                    </button>
                </div>
            ) : requests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-slate-500">
                    {t.adminPrivateClassEmpty}
                </p>
            ) : (
                <ul className="space-y-4">
                    {requests.map((row) => {
                        const status = String(row.status)
                        const isPending = status === "pending"
                        const canCancel = status === "pending" || status === "awaiting_payment"
                        return (
                            <li
                                key={row.id}
                                className="rounded-2xl border border-white/[0.08] bg-[#0c1222]/90 p-4 sm:p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-100">
                                            {t.adminPrivateClassStudent}:{" "}
                                            <span className="font-semibold text-sky-200">
                                                {row.student_email}
                                            </span>
                                        </p>
                                        <p className="text-sm text-slate-300">
                                            {t.adminPrivateClassRequested}: {row.requested_date} ·{" "}
                                            {formatPrivateClassTime(row.requested_time)}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${privateClassStatusBadgeClass(status)}`}
                                    >
                                        {privateClassStatusLabel(status, t, { forAdmin: true })}
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
                                    <p>
                                        <span className="font-semibold text-slate-500">
                                            {t.adminPrivateClassDuration}:{" "}
                                        </span>
                                        {t.privateClassDurationDisplay}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-slate-500">
                                            {t.adminPrivateClassPrice}:{" "}
                                        </span>
                                        {formatPrivateClassPriceCents(row.price_cents)}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-slate-500">
                                            {t.adminPrivateClassCreated}:{" "}
                                        </span>
                                        {row.created_at
                                            ? new Date(row.created_at).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>

                                <p className="mt-3 text-sm text-slate-400">
                                    <span className="font-semibold text-slate-500">
                                        {t.adminPrivateClassMessage}:{" "}
                                    </span>
                                    {row.student_message?.trim()
                                        ? row.student_message
                                        : t.adminPrivateClassNoMessage}
                                </p>

                                <p className="mt-2 text-sm text-slate-400">
                                    <span className="font-semibold text-slate-500">
                                        {t.adminPrivateClassAdminNotes}:{" "}
                                    </span>
                                    {row.admin_notes?.trim()
                                        ? row.admin_notes
                                        : t.adminPrivateClassNoNotes}
                                </p>

                                {status === "paid" ? (
                                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                                        <button
                                            type="button"
                                            disabled={ensuringZoomId !== null}
                                            onClick={() => void ensureZoom(row)}
                                            className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {ensuringZoomId === row.id
                                                ? t.adminPrivateClassEnsureZoomProcessing
                                                : t.adminPrivateClassEnsureZoom}
                                        </button>
                                    </div>
                                ) : null}

                                {status === "confirmed" ? (
                                    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                                        <p className="text-sm font-semibold text-emerald-300">
                                            🟢 {t.privateClassClassConfirmed}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            {t.adminPrivateClassRequested}: {row.requested_date} ·{" "}
                                            {formatPrivateClassTime(row.requested_time)}
                                            <span className="mx-2 text-slate-600">·</span>
                                            {formatPrivateClassPriceCents(row.price_cents)}
                                        </p>
                                        {typeof row.zoom_start_url === "string" &&
                                        row.zoom_start_url.trim() ? (
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
                                                    {t.adminPrivateClassZoomAvailable}
                                                </span>
                                                <a
                                                    href={row.zoom_start_url.trim()}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-500/25"
                                                >
                                                    {t.adminPrivateClassStartZoom}
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                {t.privateClassZoomPreparing}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            disabled={rescheduleSubmitting}
                                            onClick={() => openReschedule(row)}
                                            className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {t.adminPrivateClassReschedule}
                                        </button>
                                    </div>
                                ) : null}

                                {isPending || canCancel ? (
                                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                                        {isPending ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openConfirm("approve", row)}
                                                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/25"
                                                >
                                                    {t.adminPrivateClassApprove}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRejectNotes("")
                                                        setRejectError(null)
                                                        setRejectTarget(row)
                                                    }}
                                                    className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/25"
                                                >
                                                    {t.adminPrivateClassReject}
                                                </button>
                                            </>
                                        ) : null}
                                        {canCancel ? (
                                            <button
                                                type="button"
                                                onClick={() => openConfirm("cancel", row)}
                                                className="rounded-lg border border-slate-400/30 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                                            >
                                                {t.adminPrivateClassCancel}
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </li>
                        )
                    })}
                </ul>
            )}

            <CancelSessionConfirmModal
                open={confirmAction === "approve" && confirmTarget !== null}
                sessionSummary={
                    confirmTarget
                        ? `${confirmTarget.student_email} · ${confirmTarget.requested_date} · ${formatPrivateClassTime(confirmTarget.requested_time)}`
                        : ""
                }
                title={t.adminPrivateClassApproveTitle}
                description={t.adminPrivateClassApproveDescription}
                confirmText={t.adminPrivateClassApproveConfirm}
                onClose={closeConfirm}
                onConfirm={async () => {
                    if (!confirmTarget) return
                    await patchAction(confirmTarget.id, { action: "approve" })
                    setToast({ message: t.adminPrivateClassActionSuccess, tone: "success" })
                    await load()
                }}
            />

            <CancelSessionConfirmModal
                open={confirmAction === "cancel" && confirmTarget !== null}
                sessionSummary={
                    confirmTarget
                        ? `${confirmTarget.student_email} · ${confirmTarget.requested_date} · ${formatPrivateClassTime(confirmTarget.requested_time)}`
                        : ""
                }
                title={t.adminPrivateClassCancelTitle}
                description={t.adminPrivateClassCancelDescription}
                confirmText={t.adminPrivateClassCancelConfirm}
                onClose={closeConfirm}
                onConfirm={async () => {
                    if (!confirmTarget) return
                    await patchAction(confirmTarget.id, { action: "cancel" })
                    setToast({ message: t.adminPrivateClassActionSuccess, tone: "success" })
                    await load()
                }}
            />

            {rejectTarget ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reject-private-class-title"
                    className="fixed inset-0 z-[62] flex items-center justify-center bg-black/70 p-5"
                    onClick={rejectSubmitting ? undefined : () => setRejectTarget(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-red-400/30 bg-gradient-to-br from-[#111827] to-[#0B0F1A] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <h2
                            id="reject-private-class-title"
                            className="text-lg font-extrabold text-slate-50"
                        >
                            {t.adminPrivateClassRejectTitle}
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            {t.adminPrivateClassRejectDescription}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            {rejectTarget.student_email} · {rejectTarget.requested_date} ·{" "}
                            {formatPrivateClassTime(rejectTarget.requested_time)}
                        </p>
                        <label
                            htmlFor="reject-admin-notes"
                            className="mt-4 mb-1.5 block text-xs font-medium text-slate-400"
                        >
                            {t.adminPrivateClassAdminNotes}
                        </label>
                        <textarea
                            id="reject-admin-notes"
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder={t.adminPrivateClassRejectNotesPlaceholder}
                            disabled={rejectSubmitting}
                            rows={3}
                            maxLength={2000}
                            className="w-full resize-y rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-60"
                        />
                        {rejectError ? (
                            <p className="mt-2 text-sm text-red-400">{rejectError}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                disabled={rejectSubmitting}
                                onClick={() => setRejectTarget(null)}
                                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-60"
                            >
                                {t.close}
                            </button>
                            <button
                                type="button"
                                disabled={rejectSubmitting}
                                onClick={() => {
                                    void (async () => {
                                        setRejectError(null)
                                        setRejectSubmitting(true)
                                        try {
                                            await patchAction(rejectTarget.id, {
                                                action: "reject",
                                                admin_notes: rejectNotes.trim() || null,
                                            })
                                            setRejectTarget(null)
                                            setToast({
                                                message: t.adminPrivateClassActionSuccess,
                                                tone: "success",
                                            })
                                            await load()
                                        } catch (e) {
                                            setRejectError(
                                                e instanceof Error
                                                    ? e.message
                                                    : t.adminPrivateClassActionError
                                            )
                                        } finally {
                                            setRejectSubmitting(false)
                                        }
                                    })()
                                }}
                                className="rounded-lg border border-red-400/45 bg-red-500/20 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-60"
                            >
                                {rejectSubmitting ? t.saving : t.adminPrivateClassRejectConfirm}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {rescheduleTarget ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reschedule-private-class-title"
                    className="fixed inset-0 z-[62] flex items-center justify-center bg-black/70 p-5"
                    onClick={rescheduleSubmitting ? undefined : closeReschedule}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-sky-400/25 bg-gradient-to-br from-[#111827] to-[#0B0F1A] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <h2
                            id="reschedule-private-class-title"
                            className="text-lg font-extrabold text-slate-50"
                        >
                            {t.adminPrivateClassRescheduleTitle}
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            {t.adminPrivateClassRescheduleDescription}
                        </p>
                        <p className="mt-3 text-xs text-slate-500">
                            {rescheduleTarget.student_email}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                            <span className="font-semibold text-slate-500">
                                {t.adminPrivateClassRescheduleCurrent}:{" "}
                            </span>
                            {rescheduleTarget.requested_date} ·{" "}
                            {formatPrivateClassTime(rescheduleTarget.requested_time)}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <DateTimeField
                                id="reschedule-private-class-date"
                                type="date"
                                label={t.adminPrivateClassRescheduleNewDate}
                                value={rescheduleDate}
                                disabled={rescheduleSubmitting}
                                required
                                onChange={(e) => setRescheduleDate(e.target.value)}
                            />
                            <DateTimeField
                                id="reschedule-private-class-time"
                                type="time"
                                label={t.adminPrivateClassRescheduleNewTime}
                                value={rescheduleTime}
                                disabled={rescheduleSubmitting}
                                required
                                onChange={(e) => setRescheduleTime(e.target.value)}
                            />
                        </div>

                        {rescheduleError ? (
                            <p className="mt-3 text-sm text-red-400">{rescheduleError}</p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                disabled={rescheduleSubmitting}
                                onClick={closeReschedule}
                                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-60"
                            >
                                {t.close}
                            </button>
                            <button
                                type="button"
                                disabled={
                                    rescheduleSubmitting ||
                                    !rescheduleDate.trim() ||
                                    !rescheduleTime.trim()
                                }
                                onClick={() => void submitReschedule()}
                                className="rounded-lg border border-sky-400/45 bg-sky-500/20 px-3 py-2 text-xs font-bold text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {rescheduleSubmitting
                                    ? t.adminPrivateClassRescheduleProcessing
                                    : t.adminPrivateClassRescheduleConfirm}
                            </button>
                        </div>
                    </div>
                </div>
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
