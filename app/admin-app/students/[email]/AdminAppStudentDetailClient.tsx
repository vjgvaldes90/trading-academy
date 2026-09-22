"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import type { AdminAppStudentRow } from "../AdminAppStudentsClient"

type ErrorPayload = {
    error?: string
    details?: string
    ok?: unknown
    access_code?: unknown
    code?: string
}

const PATCH_ACCESS_TYPES = ["paid", "free", "vip", "discount", "discounted"] as const

function displayName(row: AdminAppStudentRow): string {
    const first = typeof row.first_name === "string" ? row.first_name.trim() : ""
    const last = typeof row.last_name === "string" ? row.last_name.trim() : ""
    const full = `${first} ${last}`.trim()
    return full || "—"
}

function studentPathEmail(email: string): string {
    return encodeURIComponent(email.trim().toLowerCase())
}

function mapStudentRow(r: Record<string, unknown>): AdminAppStudentRow {
    return {
        id: typeof r.id === "string" ? r.id : "",
        email: typeof r.email === "string" ? r.email : "",
        first_name: typeof r.first_name === "string" ? r.first_name : null,
        last_name: typeof r.last_name === "string" ? r.last_name : null,
        phone: typeof r.phone === "string" ? r.phone : null,
        plan: typeof r.plan === "string" ? r.plan : null,
        access_type: typeof r.access_type === "string" ? r.access_type : "paid",
        is_active: r.is_active !== false,
        access_expires_at:
            typeof r.access_expires_at === "string" ? r.access_expires_at : null,
        subscription_status:
            typeof r.subscription_status === "string" && r.subscription_status.trim()
                ? r.subscription_status.trim()
                : null,
    }
}

export default function AdminAppStudentDetailClient({
    studentEmail,
}: {
    studentEmail: string
}) {
    const { t, language } = useLanguage()
    const dateLocale = language === "es" ? "es-ES" : "en-US"

    const [item, setItem] = useState<AdminAppStudentRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const [editType, setEditType] = useState<string>("paid")
    const [editActive, setEditActive] = useState(true)
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
    const [saveBusy, setSaveBusy] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const [revealedCode, setRevealedCode] = useState<string | null>(null)
    const [revealBusy, setRevealBusy] = useState(false)
    const [copied, setCopied] = useState(false)

    const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false)
    const [rotateBusy, setRotateBusy] = useState(false)
    const [rotateError, setRotateError] = useState<string | null>(null)
    const [newCodeModal, setNewCodeModal] = useState<string | null>(null)

    const programLabel = useCallback(
        (raw: string | null): string => {
            const plan = resolveSubscriptionPlan(raw)
            if (plan === "full_program") return t.pricingFullProgramName
            if (plan === "trading_only") return t.pricingTradingOnlyName
            return typeof raw === "string" && raw.trim() ? raw.trim() : "—"
        },
        [t]
    )

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/trading-students", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const errObj = (payload ?? {}) as ErrorPayload
                throw new Error(
                    typeof errObj.error === "string" && errObj.error.trim()
                        ? errObj.error
                        : t.failedToLoadStudents
                )
            }
            const list = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
            const found =
                list
                    .map(mapStudentRow)
                    .find((row) => row.email.trim().toLowerCase() === studentEmail) ?? null
            if (!found) {
                throw new Error(t.failedToLoadStudents)
            }
            setItem(found)
            setEditType((found.access_type ?? "paid").toLowerCase())
            setEditActive(found.is_active !== false)
            setRevealedCode(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.errorLoadingStudents)
            setItem(null)
        } finally {
            setLoading(false)
        }
    }, [studentEmail, t.errorLoadingStudents, t.failedToLoadStudents])

    useEffect(() => {
        void load()
    }, [load])

    const accessDirty =
        item != null &&
        (editType !== (item.access_type ?? "paid").toLowerCase() ||
            editActive !== (item.is_active !== false))

    const submitAccess = async () => {
        if (!item || saveBusy || !accessDirty) return
        setSaveBusy(true)
        setSaveError(null)
        setError(null)
        setSuccessMessage(null)
        try {
            const body: Record<string, unknown> = {}
            if (editType !== (item.access_type ?? "paid").toLowerCase()) {
                body.access_type = editType
            }
            if (editActive !== (item.is_active !== false)) {
                body.is_active = editActive
            }
            const res = await fetch(
                `/api/admin/students/${studentPathEmail(studentEmail)}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify(body),
                }
            )
            const payload = (await res.json().catch(() => ({}))) as ErrorPayload &
                Record<string, unknown>
            if (!res.ok) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.updateFailed
                )
            }
            setConfirmSaveOpen(false)
            setSuccessMessage(t.adminAppStudentsSaveSuccess)
            await load()
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : t.updateFailed)
            setConfirmSaveOpen(false)
        } finally {
            setSaveBusy(false)
        }
    }

    const toggleReveal = async () => {
        if (revealBusy || rotateBusy) return
        if (revealedCode) {
            setRevealedCode(null)
            setCopied(false)
            return
        }
        setRevealBusy(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/admin/students/${studentPathEmail(studentEmail)}/access-code`,
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                }
            )
            const data = (await res.json().catch(() => ({}))) as ErrorPayload
            if (!res.ok || data.ok !== true) {
                throw new Error(
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : data.code === "missing_access_code"
                          ? t.adminAccessCodeMissing
                          : t.adminAccessCodeRevealFailed
                )
            }
            const code =
                typeof data.access_code === "string" && data.access_code.trim()
                    ? data.access_code.trim()
                    : ""
            if (!code) throw new Error(t.adminAccessCodeMissing)
            setRevealedCode(code)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminAccessCodeRevealFailed)
        } finally {
            setRevealBusy(false)
        }
    }

    const copyCode = async () => {
        if (!revealedCode) {
            setError(t.adminAppStudentsCopyNeedReveal)
            return
        }
        try {
            await navigator.clipboard.writeText(revealedCode)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
        } catch {
            setError(t.adminAccessCodeRevealFailed)
        }
    }

    const submitRotate = async () => {
        if (rotateBusy) return
        setRotateBusy(true)
        setRotateError(null)
        setError(null)
        try {
            const res = await fetch(
                `/api/admin/students/${studentPathEmail(studentEmail)}/rotate-access-code`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({}),
                }
            )
            const data = (await res.json().catch(() => ({}))) as ErrorPayload
            if (!res.ok || data.ok !== true) {
                throw new Error(
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : t.adminAccessCodeRotateFailed
                )
            }
            const code =
                typeof data.access_code === "string" && data.access_code.trim()
                    ? data.access_code.trim()
                    : ""
            if (!code) throw new Error(t.adminAccessCodeRotateFailed)
            setRotateConfirmOpen(false)
            setRevealedCode(code)
            setNewCodeModal(code)
            setSuccessMessage(t.adminAccessCodeRotateSuccess)
        } catch (e) {
            setRotateError(e instanceof Error ? e.message : t.adminAccessCodeRotateFailed)
        } finally {
            setRotateBusy(false)
        }
    }

    const actionBusy = saveBusy || revealBusy || rotateBusy

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.16),transparent_42%)]"
            />

            <header className="relative z-10 mb-4 pr-[5.5rem]">
                <Link
                    href="/admin-app/students"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppStudentsBackList}
                </Link>
            </header>

            {loading ? (
                <p className="relative z-10 rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                    {t.adminAppStudentsLoading}
                </p>
            ) : error && !item ? (
                <div className="relative z-10 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                    <p className="text-sm text-red-200">{error}</p>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                    >
                        {t.adminAppStudentsRetry}
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
                        <h1 className="text-lg font-bold tracking-tight text-white">
                            {displayName(item)}
                        </h1>
                        <p className="mt-1 break-all text-sm text-slate-400">{item.email}</p>

                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminAppStudentsPhone}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {item.phone?.trim() || "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminProgramLabel}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {programLabel(item.plan)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminAppStudentsSubscriptionStatus}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {item.subscription_status ?? "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.adminAppStudentsExpires}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {item.access_expires_at
                                        ? new Date(item.access_expires_at).toLocaleString(
                                              dateLocale,
                                              { dateStyle: "medium", timeStyle: "short" }
                                          )
                                        : t.adminAppStudentsNoExpiry}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t.accessTypeLabel}
                        </h2>
                        <label className="block text-xs font-semibold text-slate-400">
                            {t.accessTypeLabel}
                            <select
                                value={editType}
                                disabled={actionBusy}
                                onChange={(e) => setEditType(e.target.value)}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                            >
                                {PATCH_ACCESS_TYPES.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-3">
                            <span className="text-sm font-semibold text-slate-200">
                                {editActive ? t.activeLabel : t.inactiveLabel}
                            </span>
                            <input
                                type="checkbox"
                                checked={editActive}
                                disabled={actionBusy}
                                onChange={(e) => setEditActive(e.target.checked)}
                                className="h-5 w-5 accent-blue-500"
                            />
                        </label>
                        {saveError ? (
                            <p className="text-xs text-red-300">{saveError}</p>
                        ) : null}
                        <button
                            type="button"
                            disabled={actionBusy || !accessDirty}
                            onClick={() => {
                                setSaveError(null)
                                setConfirmSaveOpen(true)
                            }}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                        >
                            {t.adminAppStudentsSaveAccess}
                        </button>
                    </section>

                    <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t.adminAccessCodeLabel}
                        </h2>
                        <p className="font-mono text-lg tracking-widest text-slate-100">
                            {revealedCode ?? t.adminAccessCodeHidden}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => void toggleReveal()}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {revealBusy
                                    ? t.adminAppStudentsLoading
                                    : revealedCode
                                      ? t.adminAccessCodeHide
                                      : t.adminAccessCodeReveal}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy || !revealedCode}
                                onClick={() => void copyCode()}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-blue-400/35 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-100 transition active:bg-blue-500/25 disabled:opacity-50"
                            >
                                {copied ? t.adminAccessCodeCopied : t.adminAccessCodeCopy}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => {
                                    setRotateError(null)
                                    setRotateConfirmOpen(true)
                                }}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-bold text-amber-100 transition active:bg-amber-500/25 disabled:opacity-50"
                            >
                                {t.adminAccessCodeChange}
                            </button>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-200/80">
                            {t.adminAppStudentsRotateWarn}
                        </p>
                    </section>
                </div>
            ) : null}

            {confirmSaveOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-student-access-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="confirm-student-access-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminAppStudentsSaveConfirmTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.adminAppStudentsSaveConfirmDescription}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={saveBusy}
                                onClick={() => void submitAccess()}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                            >
                                {saveBusy ? t.saving : t.adminAppStudentsSaveConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={saveBusy}
                                onClick={() => setConfirmSaveOpen(false)}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppStudentsCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {rotateConfirmOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rotate-access-code-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-amber-400/30 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="rotate-access-code-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminAccessCodeChangeTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.adminAccessCodeChangeDescription}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-amber-200">
                            {t.adminAppStudentsRotateWarn}
                        </p>
                        {rotateError ? (
                            <p className="mt-3 text-xs text-red-300">{rotateError}</p>
                        ) : null}
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={rotateBusy}
                                onClick={() => void submitRotate()}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition active:bg-amber-400 disabled:opacity-50"
                            >
                                {rotateBusy ? t.saving : t.adminAccessCodeChangeConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={rotateBusy}
                                onClick={() => {
                                    if (!rotateBusy) setRotateConfirmOpen(false)
                                }}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppStudentsCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {newCodeModal ? (
                <div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="new-access-code-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-[#111827] p-5 shadow-xl">
                        <h2 id="new-access-code-title" className="text-base font-bold text-white">
                            {t.adminAccessCodeNewTitle}
                        </h2>
                        <p className="mt-2 text-xs text-emerald-200">
                            {t.adminAccessCodeRotateSuccess}
                        </p>
                        <p className="mt-4 break-all text-center font-mono text-2xl tracking-widest text-white">
                            {newCodeModal}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    void navigator.clipboard.writeText(newCodeModal).then(
                                        () => setCopied(true),
                                        () => setError(t.adminAccessCodeRevealFailed)
                                    )
                                }}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-blue-400/35 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-100 transition active:bg-blue-500/25"
                            >
                                {copied ? t.adminAccessCodeCopied : t.adminAccessCodeCopy}
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewCodeModal(null)}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06]"
                            >
                                {t.close}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
