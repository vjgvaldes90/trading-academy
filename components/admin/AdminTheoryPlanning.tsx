"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { useCallback, useEffect, useMemo, useState } from "react"

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
    quota_max: number
    is_active: boolean
}

type QuotaBoardNonEligible = QuotaBoardStudent & {
    reason: "theory_access_denied" | "period_not_configured" | "quota_over" | "lookup_failed"
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

function quotaBadgeClass(remaining: number): string {
    if (remaining >= 2) return "border-amber-400/40 bg-amber-500/15 text-amber-100"
    if (remaining === 1) return "border-sky-400/40 bg-sky-500/15 text-sky-100"
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
}

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
            setQuotaPending2(
                Array.isArray(payload.pending_2)
                    ? (payload.pending_2 as QuotaBoardStudent[])
                    : []
            )
            setQuotaPending1(
                Array.isArray(payload.pending_1)
                    ? (payload.pending_1 as QuotaBoardStudent[])
                    : []
            )
            setQuotaPending0(
                Array.isArray(payload.pending_0)
                    ? (payload.pending_0 as QuotaBoardStudent[])
                    : []
            )
            setQuotaNonEligible(
                Array.isArray(payload.non_eligible)
                    ? (payload.non_eligible as QuotaBoardNonEligible[])
                    : []
            )
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

    const renderQuotaStudentCard = (
        student: QuotaBoardStudent,
        extra?: { reasonLabel?: string }
    ) => (
        <li
            key={student.id}
            className="rounded-xl border border-white/10 bg-[#0B1120]/70 px-3 py-3 sm:px-4"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">
                        {studentDisplayName(student)}
                    </p>
                    <p className="truncate text-xs text-slate-500">{student.email}</p>
                    <p className="mt-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">
                            {t.adminTheoryPlanningQuotaBoardPlan}:
                        </span>{" "}
                        {t.adminTheoryPlanningQuotaBoardPlanFull}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">
                            {t.adminTheoryPlanningQuotaBoardPeriod}:
                        </span>{" "}
                        {formatQuotaPeriod(
                            student.period_start,
                            student.period_end,
                            t.adminTheoryPlanningQuotaBoardPeriodUnknown
                        )}
                    </p>
                    {extra?.reasonLabel ? (
                        <p className="mt-1 text-xs text-amber-200/90">{extra.reasonLabel}</p>
                    ) : null}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <span
                        className={[
                            "rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums",
                            quotaBadgeClass(student.remaining),
                        ].join(" ")}
                    >
                        {student.consumed}/{student.quota_max || quotaMax}
                    </span>
                    <p className="text-[11px] text-slate-500">
                        {t.adminTheoryPlanningQuotaBoardConsumed
                            .replace("{used}", String(student.consumed))
                            .replace("{max}", String(student.quota_max || quotaMax))}
                    </p>
                    <p className="text-[11px] text-slate-500">
                        {t.adminTheoryPlanningQuotaBoardRemaining.replace(
                            "{count}",
                            String(student.remaining)
                        )}
                    </p>
                </div>
            </div>
        </li>
    )

    const renderQuotaDivision = (args: {
        title: string
        count: number
        filtered: QuotaBoardStudent[]
        totalInBucket: number
        defaultOpen?: boolean
        accentClass: string
    }) => (
        <details
            open={args.defaultOpen}
            className="rounded-2xl border border-white/10 bg-white/[0.03] open:bg-white/[0.04]"
        >
            <summary
                className={[
                    "cursor-pointer list-none px-4 py-3 sm:px-5",
                    "flex flex-wrap items-center justify-between gap-2",
                    "[&::-webkit-details-marker]:hidden",
                ].join(" ")}
            >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <span
                        className={[
                            "inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border px-2 py-0.5 text-xs tabular-nums",
                            args.accentClass,
                        ].join(" ")}
                    >
                        {args.count}
                    </span>
                    {args.title}
                </span>
                <span className="text-xs text-slate-500">
                    {quotaSearch.trim() && args.filtered.length !== args.totalInBucket
                        ? `${args.filtered.length} / ${args.totalInBucket}`
                        : null}
                </span>
            </summary>
            <div className="border-t border-white/10 px-4 py-3 sm:px-5">
                {args.totalInBucket === 0 ? (
                    <p className="text-sm text-slate-400">{t.adminTheoryPlanningQuotaBoardEmpty}</p>
                ) : args.filtered.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        {t.adminTheoryPlanningQuotaBoardNoneMatch}
                    </p>
                ) : (
                    <ul className="space-y-2">{args.filtered.map((s) => renderQuotaStudentCard(s))}</ul>
                )}
            </div>
        </details>
    )

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
                    <div className="space-y-3">
                        {renderQuotaDivision({
                            title: t.adminTheoryPlanningQuotaBoardPending2,
                            count: quotaPending2.length,
                            filtered: filteredQuotaPending2,
                            totalInBucket: quotaPending2.length,
                            defaultOpen: true,
                            accentClass: "border-amber-400/40 bg-amber-500/15 text-amber-100",
                        })}
                        {renderQuotaDivision({
                            title: t.adminTheoryPlanningQuotaBoardPending1,
                            count: quotaPending1.length,
                            filtered: filteredQuotaPending1,
                            totalInBucket: quotaPending1.length,
                            defaultOpen: true,
                            accentClass: "border-sky-400/40 bg-sky-500/15 text-sky-100",
                        })}
                        {renderQuotaDivision({
                            title: t.adminTheoryPlanningQuotaBoardPending0,
                            count: quotaPending0.length,
                            filtered: filteredQuotaPending0,
                            totalInBucket: quotaPending0.length,
                            defaultOpen: false,
                            accentClass: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
                        })}

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
                                            })
                                        )}
                                    </ul>
                                )}
                            </div>
                        </details>
                    </div>
                )}
            </section>
        </div>
    )
}
