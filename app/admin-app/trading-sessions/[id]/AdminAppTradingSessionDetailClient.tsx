"use client"

import type { AdminSessionRow } from "@/components/admin/liveSessions/types"
import { useLanguage } from "@/context/LanguageProvider"
import { getMinutesUntilSessionStart, type DbSession } from "@/lib/sessions"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"

/** Admin list DTO fields used by Admin App (extends shared row shape). */
type AdminAppSessionRow = AdminSessionRow & {
    created_by_admin_email?: string | null
    last_edited_by_admin_email?: string | null
    starts_at?: string | null
}

type ListErrorPayload = {
    error?: string
    details?: string
}

function toDbSession(row: AdminAppSessionRow): DbSession {
    return {
        id: row.id,
        day: null,
        date: row.date,
        time: row.time,
        link: null,
        session_type: row.session_type === "theory" ? "theory" : "trading",
    }
}

function formatTimeDisplay(raw: string | null | undefined): string {
    if (!raw) return "—"
    const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim())
    if (!m) return raw
    return `${m[1].padStart(2, "0")}:${m[2]}`
}

function toTimeInputValue(raw: string | null | undefined): string {
    if (!raw) return ""
    const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim())
    if (!m) return ""
    const h = Number(m[1])
    if (!Number.isFinite(h) || h < 0 || h > 23) return ""
    return `${String(h).padStart(2, "0")}:${m[2]}`
}

export default function AdminAppTradingSessionDetailClient({
    sessionId,
}: {
    sessionId: string
}) {
    const { t } = useLanguage()
    const router = useRouter()
    const [item, setItem] = useState<AdminAppSessionRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
    const [editTime, setEditTime] = useState("")
    const [editType, setEditType] = useState<"trading" | "theory">("trading")
    const [actionBusy, setActionBusy] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    const [cancelError, setCancelError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/sessions", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const errObj = (payload ?? {}) as ListErrorPayload
                const base =
                    typeof errObj.error === "string" && errObj.error.trim()
                        ? errObj.error
                        : t.failedToLoadAdminSessions
                const detail =
                    typeof errObj.details === "string" && errObj.details.trim()
                        ? `${base}: ${errObj.details}`
                        : base
                throw new Error(detail)
            }
            const list = Array.isArray(payload) ? (payload as AdminAppSessionRow[]) : []
            const found = list.find((row) => row.id === sessionId) ?? null
            if (!found) {
                throw new Error(t.failedToLoadAdminSessions)
            }
            setItem(found)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.errorLoadingSessions)
            setItem(null)
        } finally {
            setLoading(false)
        }
    }, [sessionId, t.errorLoadingSessions, t.failedToLoadAdminSessions])

    useEffect(() => {
        void load()
    }, [load])

    const openEdit = () => {
        if (!item || actionBusy) return
        setEditTime(toTimeInputValue(item.time))
        setEditType(item.session_type === "theory" ? "theory" : "trading")
        setEditError(null)
        setConfirmOpen(false)
        setCancelConfirmOpen(false)
        setEditOpen(true)
    }

    const closeEdit = () => {
        if (actionBusy) return
        setEditOpen(false)
        setConfirmOpen(false)
        setEditError(null)
    }

    const openCancelConfirm = () => {
        if (!item || actionBusy) return
        setCancelError(null)
        setEditOpen(false)
        setConfirmOpen(false)
        setCancelConfirmOpen(true)
    }

    const closeCancelConfirm = () => {
        if (actionBusy) return
        setCancelConfirmOpen(false)
        setCancelError(null)
    }

    const requestSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (actionBusy) return
        setEditError(null)
        if (!editTime.trim()) {
            setEditError(t.createSessionTimeRequired)
            return
        }
        setConfirmOpen(true)
    }

    const submitEdit = async () => {
        if (!item || actionBusy) return
        if (!editTime.trim()) {
            setEditError(t.createSessionTimeRequired)
            setConfirmOpen(false)
            return
        }
        setActionBusy(true)
        setEditError(null)
        setError(null)
        setSuccessMessage(null)
        try {
            const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    time: editTime.trim(),
                    session_type: editType,
                }),
            })
            const payload = (await res.json().catch(() => ({}))) as ListErrorPayload
            if (!res.ok) {
                const base =
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.updateSessionFailed
                const detail =
                    typeof payload.details === "string" && payload.details.trim()
                        ? `${base}: ${payload.details}`
                        : base
                throw new Error(detail)
            }
            setEditOpen(false)
            setConfirmOpen(false)
            setSuccessMessage(t.adminAppTradingSessionsEditSuccess)
            await load()
        } catch (e) {
            setEditError(e instanceof Error ? e.message : t.saveError)
            setConfirmOpen(false)
        } finally {
            setActionBusy(false)
        }
    }

    const submitCancel = async () => {
        if (!item || actionBusy) return
        setActionBusy(true)
        setCancelError(null)
        setError(null)
        try {
            const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
                method: "DELETE",
                credentials: "include",
                cache: "no-store",
            })
            const payload = (await res.json().catch(() => ({}))) as ListErrorPayload
            if (!res.ok) {
                const base =
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.failedToCancelSession
                const detail =
                    typeof payload.details === "string" && payload.details.trim()
                        ? `${base}: ${payload.details}`
                        : base
                throw new Error(detail)
            }
            // Soft-cancel removes the row from GET (status=active only), same as desktop.
            setCancelConfirmOpen(false)
            try {
                sessionStorage.setItem(
                    "adminAppTradingSessionsFlash",
                    "cancelled"
                )
            } catch {
                // ignore storage failures (private mode, etc.)
            }
            router.replace("/admin-app/trading-sessions")
        } catch (e) {
            setCancelError(e instanceof Error ? e.message : t.failedToCancelSession)
        } finally {
            setActionBusy(false)
        }
    }

    const theory = item?.session_type === "theory"
    const title = item?.title?.trim() || t.adminAppTradingSessionsNoTitle
    const minutesUntil = item
        ? getMinutesUntilSessionStart(toDbSession(item), new Date())
        : null
    const isUpcoming = minutesUntil != null && minutesUntil >= 0
    const sessionSummary = item
        ? `${item.date ?? "—"} · ${formatTimeDisplay(item.time)}`
        : ""

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.16),transparent_42%)]"
            />

            <header className="relative z-10 mb-4 pr-[5.5rem]">
                <Link
                    href="/admin-app/trading-sessions"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppTradingSessionsBackList}
                </Link>
            </header>

            {loading ? (
                <p className="relative z-10 rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                    {t.loadingSessions}
                </p>
            ) : error && !item ? (
                <div className="relative z-10 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                    <p className="text-sm text-red-200">{error}</p>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                    >
                        {t.adminAppTradingSessionsRetry}
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
                            <h1 className="min-w-0 flex-1 text-lg font-bold tracking-tight text-white">
                                {title}
                            </h1>
                            <span
                                className={[
                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    theory
                                        ? "border-violet-400/35 bg-violet-500/15 text-violet-100"
                                        : "border-sky-400/35 bg-sky-500/15 text-sky-100",
                                ].join(" ")}
                            >
                                {theory
                                    ? t.sessionTypeTheoryClass
                                    : t.sessionTypeTradingSession}
                            </span>
                        </div>

                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.dateLabel}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">{item.date ?? "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.timeLabel}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {formatTimeDisplay(item.time)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t.statusLabel}
                                </dt>
                                <dd className="mt-0.5 text-slate-200">
                                    {item.status ?? "active"}
                                    {!isUpcoming
                                        ? ` · ${t.adminAppTradingSessionsPast}`
                                        : ""}
                                </dd>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {item.starts_soon ? (
                                    <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                                        {t.adminAppTradingSessionsStartsSoon}
                                    </span>
                                ) : null}
                                {item.is_live ? (
                                    <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                                        {t.adminAppTradingSessionsLive}
                                    </span>
                                ) : null}
                            </div>
                            {item.created_by_admin_email ? (
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {t.adminAppTradingSessionsCreatedBy}
                                    </dt>
                                    <dd className="mt-0.5 break-all text-slate-200">
                                        {item.created_by_admin_email}
                                    </dd>
                                </div>
                            ) : null}
                            {item.last_edited_by_admin_email ? (
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {t.adminAppTradingSessionsLastEditedBy}
                                    </dt>
                                    <dd className="mt-0.5 break-all text-slate-200">
                                        {item.last_edited_by_admin_email}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>
                    </section>

                    <section className="space-y-2 rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t.actions}
                        </h2>
                        <button
                            type="button"
                            disabled={actionBusy}
                            onClick={openEdit}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                        >
                            {t.adminAppTradingSessionsModify}
                        </button>
                        <button
                            type="button"
                            disabled={actionBusy}
                            onClick={openCancelConfirm}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100 transition active:bg-red-500/25 disabled:opacity-50"
                        >
                            {t.cancelSession}
                        </button>
                    </section>

                    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-[11px] leading-relaxed text-slate-500">
                            {t.adminAppTradingSessionsCapacityUnavailable}
                        </p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            {t.adminAppTradingSessionsParticipantLinkUnavailable}
                        </p>
                    </section>
                </div>
            ) : null}

            {editOpen && item ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-trading-session-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="edit-trading-session-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminAppTradingSessionsModify}
                        </h2>
                        <p className="mt-2 text-xs text-slate-500">
                            {t.editSessionDateReadonly}{" "}
                            <span className="text-slate-200">{item.date ?? "—"}</span>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {t.editSessionZoomNote}
                        </p>
                        <form className="mt-4 space-y-3" onSubmit={requestSave}>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.sessionTypeLabel}
                                <select
                                    value={editType}
                                    disabled={actionBusy}
                                    onChange={(e) =>
                                        setEditType(
                                            e.target.value === "theory" ? "theory" : "trading"
                                        )
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                >
                                    <option value="trading">{t.sessionTypeTradingSession}</option>
                                    <option value="theory">{t.sessionTypeTheoryClass}</option>
                                </select>
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.timeLabel}
                                <input
                                    type="time"
                                    required
                                    value={editTime}
                                    disabled={actionBusy}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            {editError ? (
                                <p className="text-xs text-red-300">{editError}</p>
                            ) : null}
                            <button
                                type="submit"
                                disabled={actionBusy}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                            >
                                {actionBusy ? t.saving : t.saveChanges}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={closeEdit}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppTradingSessionsCancelAction}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}

            {confirmOpen ? (
                <div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-edit-trading-session-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="confirm-edit-trading-session-title"
                            className="text-base font-bold text-white"
                        >
                            {t.adminAppTradingSessionsEditConfirmTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.adminAppTradingSessionsEditConfirmDescription}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => void submitEdit()}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                            >
                                {actionBusy
                                    ? t.saving
                                    : t.adminAppTradingSessionsEditConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => setConfirmOpen(false)}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppTradingSessionsCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {cancelConfirmOpen ? (
                <div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cancel-trading-session-title"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-red-400/30 bg-[#111827] p-5 shadow-xl">
                        <h2
                            id="cancel-trading-session-title"
                            className="text-base font-bold text-white"
                        >
                            {t.cancelSessionTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {t.cancelSessionDescription}
                        </p>
                        {sessionSummary ? (
                            <p className="mt-3 text-xs font-semibold text-slate-300">
                                {sessionSummary}
                            </p>
                        ) : null}
                        {cancelError ? (
                            <p className="mt-3 text-xs text-red-300">{cancelError}</p>
                        ) : null}
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => void submitCancel()}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-red-500 disabled:opacity-50"
                            >
                                {actionBusy ? t.cancelling : t.cancelSessionConfirm}
                            </button>
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={closeCancelConfirm}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppTradingSessionsCancelAction}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
