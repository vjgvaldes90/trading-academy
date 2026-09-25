"use client"

import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import { useLanguage } from "@/context/LanguageProvider"
import type { TranslationKeys } from "@/lib/i18n/en"
import { useCallback, useEffect, useMemo, useState } from "react"

type QuotaBoardExternal = {
    id: string
    class_held_on: string
    notes: string | null
    recorded_by_admin_email: string
    created_at: string
    reversed_at: string | null
    reversed_by_admin_email: string | null
    reversal_reason: string | null
}

type QuotaBoardStudent = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    plan: string
    period_start: string | null
    period_end: string | null
    consumed: number
    remaining: number
    academy_consumed?: number
    external_consumed?: number
    total_consumed?: number
    pending?: number
    quota_max: number
    is_active: boolean
    externals?: QuotaBoardExternal[]
}

type QuotaBoardNonEligible = QuotaBoardStudent & {
    reason: "theory_access_denied" | "period_not_configured" | "quota_over" | "lookup_failed"
}

type DivisionAccent = {
    panel: string
    header: string
    badge: string
    ratio: string
    divider: string
    empty: string
}

type MutationPayload = {
    ok?: unknown
    code?: unknown
    error?: unknown
}

function studentDisplayName(row: {
    first_name: string | null
    last_name: string | null
    email: string | null
}): string {
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim()
    if (name) return name
    return row.email?.trim() || "—"
}

function formatQuotaPeriod(
    start: string | null | undefined,
    end: string | null | undefined,
    unknownLabel: string
): string {
    const s = typeof start === "string" && start.trim() ? start.trim().slice(0, 10) : ""
    const e = typeof end === "string" && end.trim() ? end.trim().slice(0, 10) : ""
    if (!s && !e) return unknownLabel
    if (s && e) return `${s} → ${e}`
    return s || e
}

function formatDateTime(iso: string | null | undefined): string {
    if (typeof iso !== "string" || !iso.trim()) return "—"
    const ms = Date.parse(iso)
    if (!Number.isFinite(ms)) return iso.trim().slice(0, 19)
    try {
        return new Date(ms).toLocaleString()
    } catch {
        return iso.trim().slice(0, 19)
    }
}

function quotaBadgeClass(remaining: number): string {
    if (remaining >= 2) return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
    if (remaining === 1) return "border-amber-400/40 bg-amber-500/15 text-amber-100"
    return "border-violet-400/40 bg-violet-500/15 text-violet-100"
}

function normalizeExternals(raw: unknown): QuotaBoardExternal[] {
    if (!Array.isArray(raw)) return []
    const out: QuotaBoardExternal[] = []
    for (const item of raw) {
        if (!item || typeof item !== "object") continue
        const row = item as Record<string, unknown>
        if (typeof row.id !== "string" || !row.id.trim()) continue
        if (typeof row.class_held_on !== "string" || !row.class_held_on.trim()) continue
        if (typeof row.created_at !== "string" || !row.created_at.trim()) continue
        if (typeof row.recorded_by_admin_email !== "string" || !row.recorded_by_admin_email.trim()) {
            continue
        }
        out.push({
            id: row.id,
            class_held_on: row.class_held_on.trim().slice(0, 10),
            notes: typeof row.notes === "string" && row.notes.trim() ? row.notes.trim() : null,
            recorded_by_admin_email: row.recorded_by_admin_email.trim(),
            created_at: row.created_at.trim(),
            reversed_at:
                typeof row.reversed_at === "string" && row.reversed_at.trim()
                    ? row.reversed_at.trim()
                    : null,
            reversed_by_admin_email:
                typeof row.reversed_by_admin_email === "string" &&
                row.reversed_by_admin_email.trim()
                    ? row.reversed_by_admin_email.trim()
                    : null,
            reversal_reason:
                typeof row.reversal_reason === "string" && row.reversal_reason.trim()
                    ? row.reversal_reason.trim()
                    : null,
        })
    }
    return out.sort((a, b) => {
        const am = Date.parse(a.created_at)
        const bm = Date.parse(b.created_at)
        if (Number.isFinite(am) && Number.isFinite(bm)) return bm - am
        return b.created_at.localeCompare(a.created_at)
    })
}

function normalizeBoardStudent(raw: unknown): QuotaBoardStudent | null {
    if (!raw || typeof raw !== "object") return null
    const row = raw as Record<string, unknown>
    if (typeof row.id !== "string" || typeof row.email !== "string") return null
    const consumed =
        typeof row.total_consumed === "number" && Number.isFinite(row.total_consumed)
            ? row.total_consumed
            : typeof row.consumed === "number" && Number.isFinite(row.consumed)
              ? row.consumed
              : 0
    const remaining =
        typeof row.pending === "number" && Number.isFinite(row.pending)
            ? row.pending
            : typeof row.remaining === "number" && Number.isFinite(row.remaining)
              ? row.remaining
              : 0
    return {
        id: row.id,
        email: row.email,
        first_name: typeof row.first_name === "string" ? row.first_name : null,
        last_name: typeof row.last_name === "string" ? row.last_name : null,
        plan: typeof row.plan === "string" ? row.plan : "full_program",
        period_start: typeof row.period_start === "string" ? row.period_start : null,
        period_end: typeof row.period_end === "string" ? row.period_end : null,
        consumed,
        remaining,
        academy_consumed:
            typeof row.academy_consumed === "number" && Number.isFinite(row.academy_consumed)
                ? row.academy_consumed
                : undefined,
        external_consumed:
            typeof row.external_consumed === "number" && Number.isFinite(row.external_consumed)
                ? row.external_consumed
                : undefined,
        total_consumed:
            typeof row.total_consumed === "number" && Number.isFinite(row.total_consumed)
                ? row.total_consumed
                : consumed,
        pending:
            typeof row.pending === "number" && Number.isFinite(row.pending)
                ? row.pending
                : remaining,
        quota_max:
            typeof row.quota_max === "number" && Number.isFinite(row.quota_max) ? row.quota_max : 2,
        is_active: row.is_active !== false,
        externals: normalizeExternals(row.externals),
    }
}

function mapExternalErrorCode(code: string, t: TranslationKeys): string {
    switch (code) {
        case "quota_exceeded":
            return t.adminTheoryPlanningExternalErrorQuotaExceeded
        case "free_not_allowed":
            return t.adminTheoryPlanningExternalErrorFreeNotAllowed
        case "not_full_program":
            return t.adminTheoryPlanningExternalErrorNotFullProgram
        case "period_not_configured":
            return t.adminTheoryPlanningExternalErrorPeriodNotConfigured
        case "already_reversed":
            return t.adminTheoryPlanningExternalErrorAlreadyReversed
        case "unavailable":
            return t.adminTheoryPlanningExternalErrorUnavailable
        case "not_found":
            return t.adminTheoryPlanningExternalErrorNotFound
        case "invalid_args":
            return t.adminTheoryPlanningExternalErrorInvalidArgs
        default:
            return t.adminTheoryPlanningExternalErrorGeneric
    }
}

const DIVISION_ACCENTS = {
    pending2: {
        panel: "border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02]",
        header: "border-emerald-400/20 bg-emerald-500/[0.12]",
        badge: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
        ratio: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
        divider: "border-emerald-400/20",
        empty: "border-emerald-400/15 bg-emerald-500/[0.04] text-emerald-100/70",
    },
    pending1: {
        panel: "border-amber-400/25 bg-gradient-to-b from-amber-500/[0.08] to-white/[0.02]",
        header: "border-amber-400/20 bg-amber-500/[0.12]",
        badge: "border-amber-400/40 bg-amber-500/20 text-amber-100",
        ratio: "border-amber-400/35 bg-amber-500/10 text-amber-100",
        divider: "border-amber-400/20",
        empty: "border-amber-400/15 bg-amber-500/[0.04] text-amber-100/70",
    },
    pending0: {
        panel: "border-violet-400/25 bg-gradient-to-b from-violet-500/[0.08] to-white/[0.02]",
        header: "border-violet-400/20 bg-violet-500/[0.12]",
        badge: "border-violet-400/40 bg-violet-500/20 text-violet-100",
        ratio: "border-violet-400/35 bg-violet-500/10 text-violet-100",
        divider: "border-violet-400/20",
        empty: "border-violet-400/15 bg-violet-500/[0.04] text-violet-100/70",
    },
} as const satisfies Record<string, DivisionAccent>

async function readJson(res: Response): Promise<Record<string, unknown>> {
    return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

export default function AdminTheoryPlanning() {
    const { t } = useLanguage()

    const [quotaPending2, setQuotaPending2] = useState<QuotaBoardStudent[]>([])
    const [quotaPending1, setQuotaPending1] = useState<QuotaBoardStudent[]>([])
    const [quotaPending0, setQuotaPending0] = useState<QuotaBoardStudent[]>([])
    const [quotaNonEligible, setQuotaNonEligible] = useState<QuotaBoardNonEligible[]>([])
    const [quotaLoading, setQuotaLoading] = useState(true)
    const [quotaError, setQuotaError] = useState<string | null>(null)
    const [quotaSearch, setQuotaSearch] = useState("")
    const [quotaMax, setQuotaMax] = useState(2)

    const [registerTarget, setRegisterTarget] = useState<QuotaBoardStudent | null>(null)
    const [registerDate, setRegisterDate] = useState("")
    const [registerNotes, setRegisterNotes] = useState("")
    const [registerSubmitting, setRegisterSubmitting] = useState(false)
    const [registerError, setRegisterError] = useState<string | null>(null)

    const [reverseTarget, setReverseTarget] = useState<{
        student: QuotaBoardStudent
        external: QuotaBoardExternal
    } | null>(null)
    const [reverseReason, setReverseReason] = useState("")
    const [reverseSubmitting, setReverseSubmitting] = useState(false)
    const [reverseError, setReverseError] = useState<string | null>(null)

    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)

    const showToast = useCallback((message: string, tone: StudentToastTone) => {
        setToast({ message, tone })
    }, [])

    const loadQuotaBoard = useCallback(async () => {
        setQuotaLoading(true)
        setQuotaError(null)
        try {
            const res = await fetch("/api/admin/theory-planning/quota-board", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = await readJson(res)
            if (!res.ok) {
                setQuotaPending2([])
                setQuotaPending1([])
                setQuotaPending0([])
                setQuotaNonEligible([])
                setQuotaError(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminTheoryPlanningQuotaBoardLoadError
                )
                return
            }

            const mapList = (raw: unknown): QuotaBoardStudent[] => {
                if (!Array.isArray(raw)) return []
                const out: QuotaBoardStudent[] = []
                for (const item of raw) {
                    const normalized = normalizeBoardStudent(item)
                    if (normalized) out.push(normalized)
                }
                return out
            }

            setQuotaPending2(mapList(payload.pending_2))
            setQuotaPending1(mapList(payload.pending_1))
            setQuotaPending0(mapList(payload.pending_0))

            const withReasons: QuotaBoardNonEligible[] = []
            if (Array.isArray(payload.non_eligible)) {
                for (const item of payload.non_eligible) {
                    const normalized = normalizeBoardStudent(item)
                    if (!normalized) continue
                    const reasonVal =
                        item &&
                        typeof item === "object" &&
                        typeof (item as Record<string, unknown>).reason === "string"
                            ? String((item as Record<string, unknown>).reason)
                            : "lookup_failed"
                    const reason =
                        reasonVal === "theory_access_denied" ||
                        reasonVal === "period_not_configured" ||
                        reasonVal === "quota_over" ||
                        reasonVal === "lookup_failed"
                            ? reasonVal
                            : "lookup_failed"
                    withReasons.push({ ...normalized, reason })
                }
            }
            setQuotaNonEligible(withReasons)

            const max =
                typeof payload.quota_max === "number" && Number.isFinite(payload.quota_max)
                    ? payload.quota_max
                    : 2
            setQuotaMax(max)
        } catch {
            setQuotaPending2([])
            setQuotaPending1([])
            setQuotaPending0([])
            setQuotaNonEligible([])
            setQuotaError(t.adminTheoryPlanningQuotaBoardLoadError)
        } finally {
            setQuotaLoading(false)
        }
    }, [t])

    useEffect(() => {
        void loadQuotaBoard()
    }, [loadQuotaBoard])

    const openRegisterModal = (student: QuotaBoardStudent) => {
        setRegisterTarget(student)
        setRegisterDate("")
        setRegisterNotes("")
        setRegisterError(null)
    }

    const closeRegisterModal = () => {
        if (registerSubmitting) return
        setRegisterTarget(null)
        setRegisterError(null)
    }

    const openReverseModal = (student: QuotaBoardStudent, external: QuotaBoardExternal) => {
        setReverseTarget({ student, external })
        setReverseReason("")
        setReverseError(null)
    }

    const closeReverseModal = () => {
        if (reverseSubmitting) return
        setReverseTarget(null)
        setReverseError(null)
    }

    const submitRegister = async () => {
        if (!registerTarget || registerSubmitting) return
        const classHeldOn = registerDate.trim()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(classHeldOn)) {
            setRegisterError(t.adminTheoryPlanningExternalErrorInvalidArgs)
            return
        }
        setRegisterSubmitting(true)
        setRegisterError(null)
        try {
            const res = await fetch("/api/admin/theory-planning/quota-board/external", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: registerTarget.id,
                    class_held_on: classHeldOn,
                    notes: registerNotes.trim() || undefined,
                }),
            })
            const payload = (await readJson(res)) as MutationPayload
            if (!res.ok || payload.ok !== true) {
                const code = typeof payload.code === "string" ? payload.code : ""
                setRegisterError(mapExternalErrorCode(code, t))
                if (code === "quota_exceeded") {
                    void loadQuotaBoard()
                }
                return
            }
            setRegisterTarget(null)
            setRegisterDate("")
            setRegisterNotes("")
            showToast(t.adminTheoryPlanningExternalRegisterSuccess, "success")
            await loadQuotaBoard()
        } catch {
            setRegisterError(t.adminTheoryPlanningExternalErrorGeneric)
        } finally {
            setRegisterSubmitting(false)
        }
    }

    const submitReverse = async () => {
        if (!reverseTarget || reverseSubmitting) return
        const reason = reverseReason.trim()
        if (!reason) {
            setReverseError(t.adminTheoryPlanningExternalErrorInvalidArgs)
            return
        }
        setReverseSubmitting(true)
        setReverseError(null)
        try {
            const res = await fetch("/api/admin/theory-planning/quota-board/external/reverse", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    external_consumption_id: reverseTarget.external.id,
                    reversal_reason: reason,
                }),
            })
            const payload = (await readJson(res)) as MutationPayload
            if (!res.ok || payload.ok !== true) {
                const code = typeof payload.code === "string" ? payload.code : ""
                setReverseError(mapExternalErrorCode(code, t))
                if (code === "already_reversed") {
                    void loadQuotaBoard()
                }
                return
            }
            setReverseTarget(null)
            setReverseReason("")
            showToast(t.adminTheoryPlanningExternalReverseSuccess, "success")
            await loadQuotaBoard()
        } catch {
            setReverseError(t.adminTheoryPlanningExternalErrorGeneric)
        } finally {
            setReverseSubmitting(false)
        }
    }

    const matchesQuotaSearch = useCallback(
        (s: QuotaBoardStudent) => {
            const q = quotaSearch.trim().toLowerCase()
            if (!q) return true
            const hay = `${s.email} ${s.first_name ?? ""} ${s.last_name ?? ""}`.toLowerCase()
            return hay.includes(q)
        },
        [quotaSearch]
    )

    const filteredQuotaPending2 = useMemo(
        () => quotaPending2.filter(matchesQuotaSearch),
        [matchesQuotaSearch, quotaPending2]
    )
    const filteredQuotaPending1 = useMemo(
        () => quotaPending1.filter(matchesQuotaSearch),
        [matchesQuotaSearch, quotaPending1]
    )
    const filteredQuotaPending0 = useMemo(
        () => quotaPending0.filter(matchesQuotaSearch),
        [matchesQuotaSearch, quotaPending0]
    )
    const filteredQuotaNonEligible = useMemo(
        () => quotaNonEligible.filter(matchesQuotaSearch),
        [matchesQuotaSearch, quotaNonEligible]
    )

    const quotaEligibleTotal = quotaPending2.length + quotaPending1.length + quotaPending0.length

    const quotaReasonLabel = useCallback(
        (reason: QuotaBoardNonEligible["reason"]) => {
            switch (reason) {
                case "theory_access_denied":
                    return t.adminTheoryPlanningQuotaBoardReasonAccess
                case "period_not_configured":
                    return t.adminTheoryPlanningQuotaBoardReasonPeriod
                case "quota_over":
                    return t.adminTheoryPlanningQuotaBoardReasonOver
                case "lookup_failed":
                    return t.adminTheoryPlanningQuotaBoardReasonLookup
                default:
                    return reason
            }
        },
        [t]
    )

    const renderExternalHistory = (student: QuotaBoardStudent, showActions: boolean) => {
        const externals = student.externals ?? []
        return (
            <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t.adminTheoryPlanningExternalHistoryTitle}
                </p>
                {externals.length === 0 ? (
                    <p className="mt-1.5 text-[11px] text-slate-500">
                        {t.adminTheoryPlanningExternalHistoryEmpty}
                    </p>
                ) : (
                    <ul className="mt-2 space-y-2">
                        {externals.map((ext) => {
                            const active = !ext.reversed_at
                            return (
                                <li
                                    key={ext.id}
                                    className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold text-slate-200">
                                                {t.adminTheoryPlanningExternalClassHeldOn.replace(
                                                    "{date}",
                                                    ext.class_held_on
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-slate-500">
                                                {t.adminTheoryPlanningExternalCreatedAt.replace(
                                                    "{datetime}",
                                                    formatDateTime(ext.created_at)
                                                )}
                                            </p>
                                            {ext.notes ? (
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    {ext.notes}
                                                </p>
                                            ) : null}
                                            <p
                                                className={[
                                                    "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                                                    active ? "text-emerald-300/90" : "text-slate-500",
                                                ].join(" ")}
                                            >
                                                {active
                                                    ? t.adminTheoryPlanningExternalStatusActive
                                                    : t.adminTheoryPlanningExternalStatusReversed}
                                            </p>
                                        </div>
                                        {showActions && active ? (
                                            <button
                                                type="button"
                                                onClick={() => openReverseModal(student, ext)}
                                                className="shrink-0 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-100 transition hover:bg-amber-500/20"
                                            >
                                                {t.adminTheoryPlanningExternalReverseAction}
                                            </button>
                                        ) : null}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        )
    }

    const renderQuotaStudentCard = (
        student: QuotaBoardStudent,
        extra?: { reasonLabel?: string; eligible?: boolean }
    ) => {
        const eligible = extra?.eligible === true
        return (
            <li
                key={student.id}
                className="rounded-xl border border-white/10 bg-[#0B1120]/80 px-3 py-3"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold text-slate-100">
                            {studentDisplayName(student)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{student.email}</p>
                        <p className="mt-2 text-[11px] text-slate-400">
                            {t.adminTheoryPlanningQuotaBoardRemaining.replace(
                                "{count}",
                                String(student.remaining)
                            )}
                        </p>
                        {extra?.reasonLabel ? (
                            <p className="mt-1 text-[11px] text-amber-200/90">{extra.reasonLabel}</p>
                        ) : (
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                                {formatQuotaPeriod(
                                    student.period_start,
                                    student.period_end,
                                    t.adminTheoryPlanningQuotaBoardPeriodUnknown
                                )}
                            </p>
                        )}
                    </div>
                    <span
                        className={[
                            "shrink-0 rounded-lg border px-2 py-1 text-xs font-bold tabular-nums",
                            quotaBadgeClass(student.remaining),
                        ].join(" ")}
                    >
                        {student.consumed}/{student.quota_max || quotaMax}
                    </span>
                </div>

                {eligible ? (
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => openRegisterModal(student)}
                            className="w-full rounded-lg border border-blue-400/30 bg-blue-500/15 px-2.5 py-1.5 text-[11px] font-bold text-blue-100 transition hover:bg-blue-500/25"
                        >
                            {t.adminTheoryPlanningExternalRegisterAction}
                        </button>
                    </div>
                ) : null}

                {eligible || (student.externals && student.externals.length > 0)
                    ? renderExternalHistory(student, eligible)
                    : null}
            </li>
        )
    }

    const renderQuotaDivision = (args: {
        title: string
        count: number
        consumedRatio: string
        filtered: QuotaBoardStudent[]
        totalInBucket: number
        accent: DivisionAccent
        eligible: boolean
    }) => (
        <article
            className={[
                "flex min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                args.accent.panel,
            ].join(" ")}
        >
            <header
                className={[
                    "border-b px-3.5 py-3.5 sm:px-4",
                    args.accent.header,
                    args.accent.divider,
                ].join(" ")}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h4 className="text-sm font-bold leading-snug text-slate-50">{args.title}</h4>
                        {quotaSearch.trim() && args.filtered.length !== args.totalInBucket ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                                {args.filtered.length} / {args.totalInBucket}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                            className={[
                                "inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border px-2 py-0.5 text-xs font-bold tabular-nums",
                                args.accent.badge,
                            ].join(" ")}
                        >
                            {args.count}
                        </span>
                        <span
                            className={[
                                "rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums",
                                args.accent.ratio,
                            ].join(" ")}
                        >
                            {args.consumedRatio}
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3 sm:px-3.5">
                {args.totalInBucket === 0 ? (
                    <div
                        className={[
                            "flex flex-1 items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm",
                            args.accent.empty,
                        ].join(" ")}
                    >
                        {t.adminTheoryPlanningQuotaBoardEmpty}
                    </div>
                ) : args.filtered.length === 0 ? (
                    <div
                        className={[
                            "flex flex-1 items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm",
                            args.accent.empty,
                        ].join(" ")}
                    >
                        {t.adminTheoryPlanningQuotaBoardNoneMatch}
                    </div>
                ) : (
                    <ul className="max-h-[28rem] space-y-2 overflow-y-auto overflow-x-hidden pr-0.5 lg:max-h-[32rem]">
                        {args.filtered.map((s) =>
                            renderQuotaStudentCard(s, { eligible: args.eligible })
                        )}
                    </ul>
                )}
            </div>
        </article>
    )

    const registerAcademy =
        registerTarget?.academy_consumed ??
        Math.max(0, (registerTarget?.consumed ?? 0) - (registerTarget?.external_consumed ?? 0))
    const registerExternal = registerTarget?.external_consumed ?? 0
    const registerTotal = registerTarget?.total_consumed ?? registerTarget?.consumed ?? 0
    const registerRemaining = registerTarget?.pending ?? registerTarget?.remaining ?? 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <p className="max-w-2xl text-sm text-slate-400">{t.adminTheoryPlanningSubtitle}</p>
                <button
                    type="button"
                    onClick={() => void loadQuotaBoard()}
                    className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                >
                    {t.adminTheoryPlanningRefresh}
                </button>
            </div>

            <section className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-50">
                            {t.adminTheoryPlanningQuotaBoardTitle}
                        </h3>
                        <p className="mt-1 max-w-2xl text-xs text-slate-400">
                            {t.adminTheoryPlanningQuotaBoardSubtitle}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-300">
                            {t.adminTheoryPlanningQuotaBoardEligibleTotal.replace(
                                "{count}",
                                String(quotaEligibleTotal)
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadQuotaBoard()}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                    >
                        {t.adminTheoryPlanningQuotaBoardRefresh}
                    </button>
                </div>

                <label className="block text-sm">
                    <span className="sr-only">{t.adminTheoryPlanningQuotaBoardSearch}</span>
                    <input
                        type="search"
                        value={quotaSearch}
                        onChange={(e) => setQuotaSearch(e.target.value)}
                        placeholder={t.adminTheoryPlanningQuotaBoardSearch}
                        className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50"
                    />
                </label>

                {quotaLoading ? (
                    <p className="text-sm text-slate-400">{t.adminTheoryPlanningQuotaBoardLoading}</p>
                ) : quotaError ? (
                    <div className="space-y-2">
                        <p className="text-sm text-red-300">{quotaError}</p>
                        <button
                            type="button"
                            onClick={() => void loadQuotaBoard()}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
                        >
                            {t.adminTheoryPlanningRetry}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
                            {renderQuotaDivision({
                                title: t.adminTheoryPlanningQuotaBoardPending2,
                                count: quotaPending2.length,
                                consumedRatio: `0/${quotaMax}`,
                                filtered: filteredQuotaPending2,
                                totalInBucket: quotaPending2.length,
                                accent: DIVISION_ACCENTS.pending2,
                                eligible: true,
                            })}
                            {renderQuotaDivision({
                                title: t.adminTheoryPlanningQuotaBoardPending1,
                                count: quotaPending1.length,
                                consumedRatio: `1/${quotaMax}`,
                                filtered: filteredQuotaPending1,
                                totalInBucket: quotaPending1.length,
                                accent: DIVISION_ACCENTS.pending1,
                                eligible: true,
                            })}
                            {renderQuotaDivision({
                                title: t.adminTheoryPlanningQuotaBoardPending0,
                                count: quotaPending0.length,
                                consumedRatio: `${quotaMax}/${quotaMax}`,
                                filtered: filteredQuotaPending0,
                                totalInBucket: quotaPending0.length,
                                accent: DIVISION_ACCENTS.pending0,
                                eligible: true,
                            })}
                        </div>

                        <details className="rounded-2xl border border-white/10 bg-white/[0.02]">
                            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-300 [&::-webkit-details-marker]:hidden sm:px-5">
                                <span className="flex items-center gap-2">
                                    <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border border-white/15 bg-white/5 px-2 py-0.5 text-xs tabular-nums text-slate-300">
                                        {quotaNonEligible.length}
                                    </span>
                                    {t.adminTheoryPlanningQuotaBoardNonEligible}
                                </span>
                            </summary>
                            <div className="border-t border-white/10 px-4 py-3 sm:px-5">
                                {quotaNonEligible.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        {t.adminTheoryPlanningQuotaBoardEmpty}
                                    </p>
                                ) : filteredQuotaNonEligible.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        {t.adminTheoryPlanningQuotaBoardNoneMatch}
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {filteredQuotaNonEligible.map((s) =>
                                            renderQuotaStudentCard(s, {
                                                reasonLabel: quotaReasonLabel(s.reason),
                                                eligible: false,
                                            })
                                        )}
                                    </ul>
                                )}
                            </div>
                        </details>
                    </div>
                )}
            </section>

            {registerTarget ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="external-register-title"
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5"
                    onClick={closeRegisterModal}
                >
                    <div
                        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#111827] to-[#0B0F1A] shadow-2xl"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <div className="space-y-3 border-b border-white/10 px-5 py-4">
                            <h2
                                id="external-register-title"
                                className="text-base font-bold text-slate-50"
                            >
                                {t.adminTheoryPlanningExternalRegisterTitle}
                            </h2>
                            <div className="space-y-1 text-xs text-slate-300">
                                <p>
                                    <span className="text-slate-500">
                                        {t.adminTheoryPlanningExternalStudentLabel}:{" "}
                                    </span>
                                    {studentDisplayName(registerTarget)}
                                </p>
                                <p>
                                    {t.adminTheoryPlanningExternalAcademyConsumed.replace(
                                        "{count}",
                                        String(registerAcademy)
                                    )}
                                </p>
                                <p>
                                    {t.adminTheoryPlanningExternalExternalConsumed.replace(
                                        "{count}",
                                        String(registerExternal)
                                    )}
                                </p>
                                <p>
                                    {t.adminTheoryPlanningExternalTotalConsumed.replace(
                                        "{count}",
                                        String(registerTotal)
                                    )}
                                </p>
                                <p>
                                    {t.adminTheoryPlanningExternalRemaining.replace(
                                        "{count}",
                                        String(registerRemaining)
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 px-5 py-4">
                            <label className="block text-sm">
                                <span className="mb-1.5 block text-xs font-semibold text-slate-400">
                                    {t.adminTheoryPlanningExternalClassDateLabel}
                                </span>
                                <input
                                    type="date"
                                    value={registerDate}
                                    onChange={(e) => setRegisterDate(e.target.value)}
                                    disabled={registerSubmitting}
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50 disabled:opacity-60"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1.5 block text-xs font-semibold text-slate-400">
                                    {t.adminTheoryPlanningExternalNotesLabel}{" "}
                                    <span className="font-normal text-slate-500">
                                        ({t.adminTheoryPlanningExternalNotesOptional})
                                    </span>
                                </span>
                                <textarea
                                    value={registerNotes}
                                    onChange={(e) => setRegisterNotes(e.target.value)}
                                    disabled={registerSubmitting}
                                    rows={3}
                                    className="w-full resize-y rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50 disabled:opacity-60"
                                />
                            </label>
                            <p className="text-xs leading-relaxed text-slate-400">
                                {t.adminTheoryPlanningExternalRegisterHint}
                            </p>
                            {registerError ? (
                                <p className="text-sm text-red-300">{registerError}</p>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
                            <button
                                type="button"
                                disabled={registerSubmitting}
                                onClick={closeRegisterModal}
                                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50"
                            >
                                {t.adminTheoryPlanningExternalCancel}
                            </button>
                            <button
                                type="button"
                                disabled={registerSubmitting || !registerDate.trim()}
                                onClick={() => void submitRegister()}
                                className="rounded-lg border border-blue-400/40 bg-blue-500/20 px-3 py-2 text-xs font-bold text-blue-50 disabled:opacity-50"
                            >
                                {registerSubmitting
                                    ? t.adminTheoryPlanningExternalRegistering
                                    : t.adminTheoryPlanningExternalRegisterConfirm}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {reverseTarget ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="external-reverse-title"
                    className="fixed inset-0 z-[62] flex items-center justify-center bg-black/70 p-5"
                    onClick={closeReverseModal}
                >
                    <div
                        className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-b from-[#111827] to-[#0B0F1A] shadow-2xl"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <div className="space-y-2 border-b border-white/10 px-5 py-4">
                            <h2
                                id="external-reverse-title"
                                className="text-base font-bold text-slate-50"
                            >
                                {t.adminTheoryPlanningExternalReverseTitle}
                            </h2>
                            <p className="text-xs leading-relaxed text-slate-400">
                                {t.adminTheoryPlanningExternalReverseHint}
                            </p>
                            <p className="text-xs text-slate-300">
                                {studentDisplayName(reverseTarget.student)} ·{" "}
                                {reverseTarget.external.class_held_on}
                            </p>
                        </div>
                        <div className="space-y-3 px-5 py-4">
                            <label className="block text-sm">
                                <span className="mb-1.5 block text-xs font-semibold text-slate-400">
                                    {t.adminTheoryPlanningExternalReverseReasonLabel}
                                </span>
                                <textarea
                                    value={reverseReason}
                                    onChange={(e) => setReverseReason(e.target.value)}
                                    disabled={reverseSubmitting}
                                    rows={3}
                                    required
                                    className="w-full resize-y rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-amber-400/50 disabled:opacity-60"
                                />
                            </label>
                            {reverseError ? (
                                <p className="text-sm text-red-300">{reverseError}</p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
                            <button
                                type="button"
                                disabled={reverseSubmitting}
                                onClick={closeReverseModal}
                                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50"
                            >
                                {t.adminTheoryPlanningExternalCancel}
                            </button>
                            <button
                                type="button"
                                disabled={reverseSubmitting || !reverseReason.trim()}
                                onClick={() => void submitReverse()}
                                className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-50 disabled:opacity-50"
                            >
                                {reverseSubmitting
                                    ? t.adminTheoryPlanningExternalReversing
                                    : t.adminTheoryPlanningExternalReverseConfirm}
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
