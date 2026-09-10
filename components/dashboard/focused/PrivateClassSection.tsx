"use client"

import RequestPrivateClassModal from "@/components/dashboard/focused/RequestPrivateClassModal"
import {
    formatPrivateClassPriceCents,
    formatPrivateClassTime,
    privateClassStatusBadgeClass,
    privateClassStatusLabel,
} from "@/components/dashboard/privateClassLabels"
import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import { useLanguage } from "@/context/LanguageProvider"
import { useSession } from "@/context/SessionContext"
import type { PrivateClassRequestRow } from "@/lib/privateClassRequests"
import { useCallback, useEffect, useState } from "react"

export default function PrivateClassSection() {
    const { t } = useLanguage()
    const { academyAccess } = useSession()
    const canAccess = academyAccess.canAccess === true

    const [requests, setRequests] = useState<PrivateClassRequestRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [payingId, setPayingId] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)

    const load = useCallback(async () => {
        if (!canAccess) {
            setRequests([])
            setLoading(false)
            setError(null)
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/private-class-requests", {
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
                        : t.privateClassLoadError
                )
                return
            }
            setRequests(Array.isArray(payload.requests) ? payload.requests : [])
        } catch {
            setRequests([])
            setError(t.privateClassLoadError)
        } finally {
            setLoading(false)
        }
    }, [canAccess, t])

    useEffect(() => {
        void load()
    }, [load])

    const startCheckout = async (requestId: string) => {
        if (payingId) return
        setPayingId(requestId)
        try {
            const res = await fetch(`/api/private-class-requests/${requestId}/checkout`, {
                method: "POST",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as {
                url?: string
                error?: string
            }
            if (!res.ok || typeof payload.url !== "string" || !payload.url.trim()) {
                setToast({
                    message:
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.privateClassCheckoutError,
                    tone: "error",
                })
                return
            }
            window.location.assign(payload.url)
        } catch {
            setToast({
                message: t.privateClassPaymentCouldNotStart,
                tone: "error",
            })
        } finally {
            setPayingId(null)
        }
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#151b2e] to-[#0f1424] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                        <h3 className="text-lg font-bold tracking-tight text-slate-50">
                            {t.privateClassTitle}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-400">{t.privateClassSubtitle}</p>
                        <p className="text-sm text-slate-300">
                            <span className="font-semibold text-slate-400">{t.privateClassPriceLabel}:</span>{" "}
                            <span className="font-bold text-amber-300">{t.privateClassPriceDisplay}</span>
                            <span className="mx-2 text-slate-600">·</span>
                            <span className="font-medium text-slate-300">{t.privateClassDurationDisplay}</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={!canAccess}
                        onClick={() => setModalOpen(true)}
                        title={!canAccess ? t.privateClassAccessRequired : undefined}
                        className="shrink-0 rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-sm font-bold text-violet-100 transition hover:border-violet-300/55 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {t.privateClassRequestButton}
                    </button>
                </div>
                {!canAccess ? (
                    <p className="mt-3 text-xs text-amber-200/90">{t.privateClassAccessRequired}</p>
                ) : null}
            </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {t.privateClassYourRequests}
                </h4>

                {loading ? (
                    <p className="py-6 text-center text-sm text-slate-500">{t.loading}</p>
                ) : error ? (
                    <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-5 text-center">
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
                    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
                        {t.privateClassEmpty}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {requests.map((row) => {
                            const status = String(row.status)
                            const isPaying = payingId === row.id
                            return (
                                <li
                                    key={row.id}
                                    className="rounded-xl border border-white/10 bg-[#0c1222]/80 px-4 py-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-100">
                                                {row.requested_date} ·{" "}
                                                {formatPrivateClassTime(row.requested_time)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {t.privateClassDurationDisplay} ·{" "}
                                                {formatPrivateClassPriceCents(row.price_cents)}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${privateClassStatusBadgeClass(status)}`}
                                        >
                                            {privateClassStatusLabel(status, t)}
                                        </span>
                                    </div>
                                    {row.student_message ? (
                                        <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                            <span className="font-semibold text-slate-500">
                                                {t.privateClassMessage}:{" "}
                                            </span>
                                            {row.student_message}
                                        </p>
                                    ) : null}
                                    {row.admin_notes &&
                                    (status === "rejected" ||
                                        status === "cancelled" ||
                                        status === "awaiting_payment") ? (
                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                            <span className="font-semibold text-slate-500">
                                                {t.privateClassAdminNotesLabel}:{" "}
                                            </span>
                                            {row.admin_notes}
                                        </p>
                                    ) : null}

                                    {status === "awaiting_payment" ? (
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                disabled={payingId !== null}
                                                onClick={() => void startCheckout(row.id)}
                                                className="inline-flex w-full items-center justify-center rounded-lg border border-amber-300/40 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-[0_10px_28px_rgba(245,158,11,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                            >
                                                {isPaying
                                                    ? t.privateClassPaymentProcessing
                                                    : t.privateClassPayButton}
                                            </button>
                                        </div>
                                    ) : null}

                                    {status === "paid" ? (
                                        <p className="mt-3 text-sm font-semibold text-emerald-300">
                                            {t.privateClassPaymentCompleted}
                                        </p>
                                    ) : null}

                                    {status === "paid" && !row.zoom_join_url ? (
                                        <p className="mt-2 text-sm text-slate-400">
                                            {t.privateClassZoomPreparing}
                                        </p>
                                    ) : null}

                                    {status === "confirmed" ? (
                                        <div className="mt-4 space-y-3">
                                            <p className="text-sm font-semibold text-emerald-300">
                                                🟢 {t.privateClassClassConfirmed}
                                            </p>
                                            {typeof row.zoom_join_url === "string" &&
                                            row.zoom_join_url.trim() ? (
                                                <a
                                                    href={row.zoom_join_url.trim()}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex w-full items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/20 px-4 py-2.5 text-sm font-bold text-violet-100 transition hover:bg-violet-500/30 sm:w-auto"
                                                >
                                                    {t.privateClassJoinZoom}
                                                </a>
                                            ) : (
                                                <p className="text-sm text-slate-400">
                                                    {t.privateClassZoomPreparing}
                                                </p>
                                            )}
                                        </div>
                                    ) : null}

                                    {status === "completed" ? (
                                        <p className="mt-4 text-sm font-semibold text-slate-300">
                                            {t.privateClassClassCompleted}
                                        </p>
                                    ) : null}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <RequestPrivateClassModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={() => void load()}
                onSuccessToast={(message) => setToast({ message, tone: "success" })}
                onErrorToast={(message) => setToast({ message, tone: "error" })}
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
