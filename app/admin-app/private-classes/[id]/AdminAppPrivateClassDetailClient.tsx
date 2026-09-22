"use client"

import {
    formatPrivateClassPriceCents,
    formatPrivateClassTime,
    privateClassStatusBadgeClass,
    privateClassStatusLabel,
} from "@/components/dashboard/privateClassLabels"
import { useLanguage } from "@/context/LanguageProvider"
import { adminPrivateClassRequest, isPrivateClassStatus } from "@/lib/privateClassRequests"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type AdminPrivateClassRequest = ReturnType<typeof adminPrivateClassRequest>

type ListPayload = {
    requests?: AdminPrivateClassRequest[]
    error?: string
}

type MutationPayload = {
    request?: AdminPrivateClassRequest
    error?: string
    code?: string
    warning?: string
    email_sent?: boolean
}

type ConfirmModal = "approve" | "reject" | null

function toTimeInputValue(raw: string | null | undefined): string {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(raw ?? "").trim())
    if (!m) return ""
    return `${m[1].padStart(2, "0")}:${m[2]}`
}

export default function AdminAppPrivateClassDetailClient({
    requestId,
}: {
    requestId: string
}) {
    const { t, language } = useLanguage()
    const [item, setItem] = useState<AdminPrivateClassRequest | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [actionBusy, setActionBusy] = useState(false)
    const [confirmModal, setConfirmModal] = useState<ConfirmModal>(null)
    const [rejectNotes, setRejectNotes] = useState("")
    const [rescheduleOpen, setRescheduleOpen] = useState(false)
    const [rescheduleDate, setRescheduleDate] = useState("")
    const [rescheduleTime, setRescheduleTime] = useState("")
    const [rescheduleError, setRescheduleError] = useState<string | null>(null)

    const dateLocale = language === "es" ? "es-ES" : "en-US"

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/private-class-requests", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as ListPayload
            if (!res.ok) {
                throw new Error(
                    typeof payload.error === "string"
                        ? payload.error
                        : t.adminPrivateClassLoadError
                )
            }
            const list = Array.isArray(payload.requests) ? payload.requests : []
            const found = list.find((row) => row.id === requestId) ?? null
            if (!found) {
                throw new Error(t.adminPrivateClassLoadError)
            }
            setItem(found)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminPrivateClassLoadError)
            setItem(null)
        } finally {
            setLoading(false)
        }
    }, [requestId, t.adminPrivateClassLoadError])

    useEffect(() => {
        void load()
    }, [load])

    const closeConfirm = () => {
        if (actionBusy) return
        setConfirmModal(null)
        setRejectNotes("")
    }

    const openReschedule = () => {
        if (!item || actionBusy) return
        setRescheduleError(null)
        setRescheduleDate(String(item.requested_date ?? "").trim())
        setRescheduleTime(toTimeInputValue(item.requested_time))
        setRescheduleOpen(true)
    }

    const closeReschedule = () => {
        if (actionBusy) return
        setRescheduleOpen(false)
        setRescheduleError(null)
    }

    const runPatch = async (body: {
        action: "approve" | "reject"
        admin_notes?: string | null
    }) => {
        if (!item || actionBusy) return
        setActionBusy(true)
        setError(null)
        setSuccessMessage(null)
        try {
            const res = await fetch(
                `/api/admin/private-class-requests/${encodeURIComponent(requestId)}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify(body),
                }
            )
            const payload = (await res.json().catch(() => ({}))) as MutationPayload
            if (!res.ok) {
                if (res.status === 409) {
                    throw new Error(t.adminAppPrivateClassesConflict)
                }
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminPrivateClassActionError
                )
            }
            if (payload.request) {
                setItem(payload.request)
            } else {
                await load()
            }
            setConfirmModal(null)
            setRejectNotes("")
            setSuccessMessage(t.adminPrivateClassActionSuccess)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminPrivateClassActionError)
        } finally {
            setActionBusy(false)
        }
    }

    const submitReschedule = async () => {
        if (!item || actionBusy) return
        const date = rescheduleDate.trim()
        const time = rescheduleTime.trim()
        if (!date || !time) {
            setRescheduleError(t.adminPrivateClassRescheduleError)
            return
        }
        setActionBusy(true)
        setRescheduleError(null)
        setError(null)
        setSuccessMessage(null)
        try {
            const res = await fetch(
                `/api/admin/private-class-requests/${encodeURIComponent(requestId)}/reschedule`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({
                        requested_date: date,
                        requested_time: time,
                    }),
                }
            )
            const payload = (await res.json().catch(() => ({}))) as MutationPayload
            if (!res.ok) {
                if (res.status === 409) {
                    throw new Error(t.adminAppPrivateClassesConflict)
                }
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminPrivateClassRescheduleError
                )
            }
            if (payload.request) {
                setItem(payload.request)
            } else {
                await load()
            }
            setRescheduleOpen(false)
            if (
                payload.email_sent === false ||
                payload.warning === "rescheduled_but_email_failed"
            ) {
                setSuccessMessage(t.adminPrivateClassRescheduleEmailWarning)
            } else {
                setSuccessMessage(t.adminPrivateClassRescheduleSuccess)
            }
        } catch (e) {
            setRescheduleError(
                e instanceof Error ? e.message : t.adminPrivateClassRescheduleError
            )
        } finally {
            setActionBusy(false)
        }
    }

    const status = item && isPrivateClassStatus(item.status) ? item.status : item?.status ?? ""
    const canApprove = status === "pending"
    const canReject = status === "pending"
    const canReschedule =
        status === "confirmed" &&
        typeof item?.zoom_meeting_id === "string" &&
        item.zoom_meeting_id.trim().length > 0

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.16),transparent_42%)]"
            />

            <header className="relative z-10 mb-4 pr-[5.5rem]">
                <Link
                    href="/admin-app/private-classes"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppPrivateClassesBackList}
                </Link>
            </header>

            {loading ? (
                <p className="relative z-10 rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                    {t.adminPrivateClassLoading}
                </p>
            ) : error && !item ? (
                <div className="relative z-10 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                    <p className="text-sm text-red-200">{error}</p>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                    >
                        {t.adminPrivateClassRetry}
                    </button>
                </div>
            ) : item ? (
                <div className="relative z-10 flex flex-col gap-4">
                    {error ? (
                        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                            {error}
                        </p>
                    ) : null}
                    {successMessage ? (
                        <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                            {successMessage}
                        </p>
                    ) : null}

                    <section className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <h1 className="min-w-0 flex-1 break-all text-lg font-bold tracking-tight text-white">
                                {item.student_email}
                            </h1>
                            <span
                                className={[
                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    privateClassStatusBadgeClass(String(status)),
                                ].join(" ")}
                            >
                                {privateClassStatusLabel(String(status), t, { forAdmin: true })}
                            </span>
                        </div>

                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminPrivateClassRequested}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {item.requested_date} ·{" "}
                                    {formatPrivateClassTime(item.requested_time)}
                                </dd>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {t.adminPrivateClassDuration}
                                    </dt>
                                    <dd className="mt-0.5 text-slate-200">
                                        {item.duration_minutes} min
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {t.adminPrivateClassPrice}
                                    </dt>
                                    <dd className="mt-0.5 text-slate-200">
                                        {formatPrivateClassPriceCents(item.price_cents)}
                                    </dd>
                                </div>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminPrivateClassMessage}
                                </dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-slate-200">
                                    {item.student_message?.trim()
                                        ? item.student_message
                                        : t.adminPrivateClassNoMessage}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminPrivateClassAdminNotes}
                                </dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-slate-200">
                                    {item.admin_notes?.trim()
                                        ? item.admin_notes
                                        : t.adminPrivateClassNoNotes}
                                </dd>
                            </div>
                            {item.stripe_payment_status ? (
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {t.adminPrivateClassPaymentStatus}
                                    </dt>
                                    <dd className="mt-0.5 text-slate-200">
                                        {item.stripe_payment_status}
                                    </dd>
                                </div>
                            ) : null}
                            {item.paid_at ? (
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {t.adminPrivateClassPaidAt}
                                    </dt>
                                    <dd className="mt-0.5 text-slate-200">
                                        {new Date(item.paid_at).toLocaleString(dateLocale, {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        })}
                                    </dd>
                                </div>
                            ) : null}
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminPrivateClassCreated}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {item.created_at
                                        ? new Date(item.created_at).toLocaleString(dateLocale, {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                          })
                                        : "—"}
                                </dd>
                            </div>
                            {item.zoom_meeting_id ? (
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        Zoom
                                    </dt>
                                    <dd className="mt-0.5 text-emerald-300">
                                        {t.adminPrivateClassZoomAvailable}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>
                    </section>

                    {(canApprove || canReject || canReschedule) && (
                        <section className="space-y-2 rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                            {canApprove ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => setConfirmModal("approve")}
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-emerald-500 disabled:opacity-50"
                                >
                                    {t.adminPrivateClassApprove}
                                </button>
                            ) : null}
                            {canReject ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => setConfirmModal("reject")}
                                    className="inline-flex w-full items-center justify-center rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-2.5 text-sm font-bold text-red-100 transition active:bg-red-500/25 disabled:opacity-50"
                                >
                                    {t.adminPrivateClassReject}
                                </button>
                            ) : null}
                            {canReschedule ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={openReschedule}
                                    className="inline-flex w-full items-center justify-center rounded-xl border border-blue-400/35 bg-blue-500/15 px-4 py-2.5 text-sm font-bold text-blue-100 transition active:bg-blue-500/25 disabled:opacity-50"
                                >
                                    {t.adminPrivateClassReschedule}
                                </button>
                            ) : null}
                        </section>
                    )}
                </div>
            ) : null}

            {confirmModal === "approve" ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="approve-private-class-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="approve-private-class-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminPrivateClassApproveTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.adminPrivateClassApproveDescription}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => void runPatch({ action: "approve" })}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-emerald-500 disabled:opacity-50"
                            >
                                {actionBusy
                                    ? t.adminPrivateClassLoading
                                    : t.adminPrivateClassApproveConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={closeConfirm}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppPrivateClassesCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {confirmModal === "reject" ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reject-private-class-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="reject-private-class-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminPrivateClassRejectTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.adminPrivateClassRejectDescription}
                        </p>
                        <label className="mt-4 block text-xs font-semibold text-slate-400">
                            {t.adminAppPrivateClassesRejectNotes}
                            <textarea
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                rows={3}
                                disabled={actionBusy}
                                placeholder={t.adminPrivateClassRejectNotesPlaceholder}
                                className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400/40 disabled:opacity-50"
                            />
                        </label>
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() =>
                                    void runPatch({
                                        action: "reject",
                                        admin_notes: rejectNotes.trim() || null,
                                    })
                                }
                                className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-red-500 disabled:opacity-50"
                            >
                                {actionBusy
                                    ? t.adminPrivateClassLoading
                                    : t.adminPrivateClassRejectConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={closeConfirm}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppPrivateClassesCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {rescheduleOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reschedule-private-class-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="reschedule-private-class-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminPrivateClassRescheduleTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.adminPrivateClassRescheduleDescription}
                        </p>
                        {item ? (
                            <p className="mt-3 text-xs text-slate-500">
                                {t.adminPrivateClassRescheduleCurrent}: {item.requested_date} ·{" "}
                                {formatPrivateClassTime(item.requested_time)}
                            </p>
                        ) : null}
                        <label className="mt-4 block text-xs font-semibold text-slate-400">
                            {t.adminPrivateClassRescheduleNewDate}
                            <input
                                type="date"
                                value={rescheduleDate}
                                onChange={(e) => setRescheduleDate(e.target.value)}
                                disabled={actionBusy}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                            />
                        </label>
                        <label className="mt-3 block text-xs font-semibold text-slate-400">
                            {t.adminPrivateClassRescheduleNewTime}
                            <input
                                type="time"
                                value={rescheduleTime}
                                onChange={(e) => setRescheduleTime(e.target.value)}
                                disabled={actionBusy}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                            />
                        </label>
                        {rescheduleError ? (
                            <p className="mt-3 text-xs text-red-300">{rescheduleError}</p>
                        ) : null}
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={
                                    actionBusy ||
                                    !rescheduleDate.trim() ||
                                    !rescheduleTime.trim()
                                }
                                onClick={() => void submitReschedule()}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                            >
                                {actionBusy
                                    ? t.adminPrivateClassRescheduleProcessing
                                    : t.adminPrivateClassRescheduleConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={closeReschedule}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppPrivateClassesCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
