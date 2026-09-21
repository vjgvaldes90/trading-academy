"use client"

import type { AdminDashboardView } from "@/components/admin/AdminSidebar"
import type { AdminRevenueMetrics } from "@/lib/adminRevenue"
import { formatUsdFromCents } from "@/lib/adminRevenue"
import type { ExecutiveMetrics } from "@/lib/executiveDashboard"
import { useLanguage } from "@/context/LanguageProvider"
import {
    BookOpen,
    CalendarPlus,
    CreditCard,
    LifeBuoy,
    TrendingUp,
    UserPlus,
    Users,
    UserCheck,
    type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type DashboardPayload = {
    metrics?: ExecutiveMetrics
    studentGrowth?: unknown
    revenue?: AdminRevenueMetrics | null
    error?: string
}

function formatMomLabel(percent: number | null): { text: string; tone: "up" | "down" | "flat" | "na" } {
    if (percent === null || !Number.isFinite(percent)) {
        return { text: "—", tone: "na" }
    }
    const rounded = Math.round(percent * 10) / 10
    const abs = Math.abs(rounded)
    const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
    if (rounded > 0) return { text: `↑ ${formatted}%`, tone: "up" }
    if (rounded < 0) return { text: `↓ ${formatted}%`, tone: "down" }
    return { text: `→ ${formatted}%`, tone: "flat" }
}

const cardShell =
    "rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827]/95 to-[#0a0f1a] shadow-[0_20px_40px_-28px_rgba(0,0,0,0.75)]"

export default function AdminOverview({
    setActiveView,
}: {
    setActiveView: (view: AdminDashboardView) => void
}) {
    const { t } = useLanguage()
    const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null)
    const [revenue, setRevenue] = useState<AdminRevenueMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch("/api/admin/executive-dashboard", {
                    cache: "no-store",
                    credentials: "include",
                })
                const payload = (await res.json().catch(() => ({}))) as DashboardPayload
                if (!res.ok) {
                    throw new Error(
                        typeof payload.error === "string" ? payload.error : t.failedToLoadOverview
                    )
                }
                if (cancelled) return
                setMetrics(payload.metrics ?? null)
                setRevenue(payload.revenue ?? null)
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : t.failedToLoadOverview)
                    setMetrics(null)
                    setRevenue(null)
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        return () => {
            cancelled = true
        }
    }, [t])

    const statCards = useMemo(
        () => {
            const m = metrics
            return [
                {
                    label: t.adminTotalStudents,
                    value: m?.totalStudents,
                    Icon: Users,
                    accent: "text-blue-300 bg-blue-500/15 border-blue-400/25",
                },
                {
                    label: t.adminActiveStudents,
                    value: m?.activeStudents,
                    Icon: UserCheck,
                    accent: "text-emerald-300 bg-emerald-500/15 border-emerald-400/25",
                },
                {
                    label: t.adminNewThisWeek,
                    value: m?.newThisWeek,
                    Icon: UserPlus,
                    accent: "text-sky-300 bg-sky-500/15 border-sky-400/25",
                },
                {
                    label: t.adminNewThisMonth,
                    value: m?.newThisMonth,
                    Icon: TrendingUp,
                    accent: "text-amber-300 bg-amber-500/15 border-amber-400/25",
                },
                {
                    label: t.adminOpenSupportTickets,
                    value: m?.openSupportTickets,
                    Icon: LifeBuoy,
                    accent: "text-rose-300 bg-rose-500/15 border-rose-400/25",
                },
            ] as const
        },
        [metrics, t]
    )

    const mom = useMemo(
        () => formatMomLabel(revenue?.vsPreviousMonthPercent ?? null),
        [revenue?.vsPreviousMonthPercent]
    )

    const quickActions = useMemo(
        () => [
            {
                Icon: BookOpen,
                title: t.adminQuickAddClass,
                description: t.adminQuickAddClassDesc,
                view: "classes" as const,
            },
            {
                Icon: CalendarPlus,
                title: t.adminQuickScheduleSession,
                description: t.adminQuickScheduleSessionDesc,
                view: "sessions" as const,
            },
            {
                Icon: Users,
                title: t.adminQuickViewStudents,
                description: t.adminQuickViewStudentsDesc,
                view: "students" as const,
            },
            {
                Icon: CreditCard,
                title: t.adminQuickManageSubscriptions,
                description: t.adminQuickManageSubscriptionsDesc,
                view: "subscriptions" as const,
            },
        ],
        [t]
    )

    return (
        <div className="space-y-8 lg:space-y-10">
            <header className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-[#121a2b] via-[#0d1424] to-[#0a0f1a] px-5 py-6 sm:px-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl"
                />
                <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300/80">
                    {t.adminLabel}
                </p>
                <h2 className="relative mt-2 text-2xl font-extrabold tracking-tight text-slate-50 sm:text-[1.7rem]">
                    {t.adminExecutiveDashboard}
                </h2>
                <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                    {t.adminExecutiveDashboardSubtitle}
                </p>
            </header>

            {error ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            <section aria-label={t.adminOverview}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {statCards.map((c) => {
                        const Icon = c.Icon as LucideIcon
                        return (
                            <div
                                key={c.label}
                                className={`${cardShell} group p-5 transition duration-200 hover:border-blue-400/30 hover:shadow-[0_24px_48px_-28px_rgba(37,99,235,0.45)]`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        {c.label}
                                    </p>
                                    <span
                                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${c.accent}`}
                                    >
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </span>
                                </div>
                                <p className="mt-4 text-3xl font-extrabold tabular-nums tracking-tight text-slate-50">
                                    {loading ? "…" : c.value ?? "—"}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                <div
                    className={`${cardShell} p-5 sm:p-6 lg:col-span-5`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {t.adminRevenue}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{t.adminRevenueThisMonth}</p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/15 text-amber-300">
                            <CreditCard className="h-4 w-4" aria-hidden />
                        </span>
                    </div>

                    {loading ? (
                        <p className="mt-5 text-3xl font-extrabold tabular-nums text-slate-50">…</p>
                    ) : revenue ? (
                        <>
                            <p className="mt-5 text-3xl font-extrabold tabular-nums tracking-tight text-slate-50">
                                {formatUsdFromCents(revenue.thisMonthCents)}
                            </p>
                            <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm">
                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-slate-400">{t.adminRevenueToday}</dt>
                                    <dd className="tabular-nums font-semibold text-slate-200">
                                        {formatUsdFromCents(revenue.todayCents)}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-slate-400">{t.adminRevenueThisWeek}</dt>
                                    <dd className="tabular-nums font-semibold text-slate-200">
                                        {formatUsdFromCents(revenue.thisWeekCents)}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-slate-400">{t.adminRevenueThisMonth}</dt>
                                    <dd className="tabular-nums font-semibold text-slate-200">
                                        {formatUsdFromCents(revenue.thisMonthCents)}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-slate-400">{t.adminRevenueAllTime}</dt>
                                    <dd className="tabular-nums font-semibold text-slate-200">
                                        {formatUsdFromCents(revenue.allTimeCents)}
                                    </dd>
                                </div>
                            </dl>
                            <p
                                className={[
                                    "mt-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                                    mom.tone === "up"
                                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                        : mom.tone === "down"
                                          ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                                          : "border-white/10 bg-white/5 text-slate-400",
                                ].join(" ")}
                            >
                                {mom.text}
                                <span className="font-medium text-slate-500">
                                    {t.adminRevenueVsPreviousMonth}
                                </span>
                            </p>
                        </>
                    ) : (
                        <p className="mt-5 text-sm text-slate-500">{t.adminRevenueUnavailable}</p>
                    )}
                </div>

                <div className={`${cardShell} p-5 sm:p-6 lg:col-span-7`}>
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                                {t.quickActions}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{t.adminOverviewSubtitle}</p>
                        </div>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {quickActions.map(({ Icon, title, description, view }) => (
                            <button
                                key={view}
                                type="button"
                                onClick={() => setActiveView(view)}
                                className={[
                                    "group flex cursor-pointer items-start gap-3 rounded-xl border border-white/10",
                                    "bg-white/[0.03] p-4 text-left transition-all duration-200",
                                    "hover:border-blue-500/35 hover:bg-blue-500/[0.07] hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]",
                                    "active:scale-[0.99]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]",
                                ].join(" ")}
                            >
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-blue-300 transition duration-200 group-hover:scale-105">
                                    <Icon className="h-5 w-5" aria-hidden />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-extrabold leading-snug text-slate-100">
                                        {title}
                                    </span>
                                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                                        {description}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
