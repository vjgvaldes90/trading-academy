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

const surface =
    "rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.65)]"

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

    const statCards = useMemo(() => {
        const m = metrics
        return [
            {
                label: t.adminTotalStudents,
                value: m?.totalStudents,
                Icon: Users,
                iconWrap: "text-blue-300 bg-blue-500/12 border-blue-400/20",
            },
            {
                label: t.adminActiveStudents,
                value: m?.activeStudents,
                Icon: UserCheck,
                iconWrap: "text-emerald-300 bg-emerald-500/12 border-emerald-400/20",
            },
            {
                label: t.adminNewThisWeek,
                value: m?.newThisWeek,
                Icon: UserPlus,
                iconWrap: "text-sky-300 bg-sky-500/12 border-sky-400/20",
            },
            {
                label: t.adminNewThisMonth,
                value: m?.newThisMonth,
                Icon: TrendingUp,
                iconWrap: "text-amber-300 bg-amber-500/12 border-amber-400/20",
            },
            {
                label: t.adminOpenSupportTickets,
                value: m?.openSupportTickets,
                Icon: LifeBuoy,
                iconWrap: "text-rose-300 bg-rose-500/12 border-rose-400/20",
            },
        ] as const
    }, [metrics, t])

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
        <div className="space-y-5 lg:space-y-6">
            {/* Compact admin greeting — no large banner */}
            <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
                        {t.smartOptionAcademy}
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                        {t.adminLabel}
                        <span className="font-semibold text-slate-400"> · {t.adminOverview}</span>
                    </h2>
                    <p className="mt-1 max-w-xl text-sm text-slate-400">{t.adminOverviewSubtitle}</p>
                </div>
            </header>

            {error ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            {/* Compact KPI row */}
            <section aria-label={t.adminOverview}>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {statCards.map((c) => {
                        const Icon = c.Icon as LucideIcon
                        return (
                            <div
                                key={c.label}
                                className={`${surface} flex min-h-[6.5rem] flex-col justify-between p-4 transition hover:border-blue-400/25`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-[11px] font-medium leading-tight text-slate-400">
                                        {c.label}
                                    </p>
                                    <span
                                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${c.iconWrap}`}
                                    >
                                        <Icon className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                </div>
                                <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-50">
                                    {loading ? "…" : c.value ?? "—"}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Main left + quick actions right */}
            <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
                <div className="space-y-4 lg:col-span-8">
                    <div className={`${surface} p-4 sm:p-5`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 text-amber-300">
                                    <CreditCard className="h-4 w-4" aria-hidden />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">{t.adminRevenue}</p>
                                    <p className="text-xs text-slate-500">{t.adminRevenueThisMonth}</p>
                                </div>
                            </div>
                            {loading ? (
                                <p className="text-xl font-bold tabular-nums text-slate-50">…</p>
                            ) : revenue ? (
                                <div className="text-right">
                                    <p className="text-xl font-bold tabular-nums text-slate-50 sm:text-2xl">
                                        {formatUsdFromCents(revenue.thisMonthCents)}
                                    </p>
                                    <p
                                        className={[
                                            "mt-0.5 text-xs font-semibold tabular-nums",
                                            mom.tone === "up"
                                                ? "text-emerald-400"
                                                : mom.tone === "down"
                                                  ? "text-rose-400"
                                                  : "text-slate-500",
                                        ].join(" ")}
                                    >
                                        {mom.text}{" "}
                                        <span className="font-medium text-slate-500">
                                            {t.adminRevenueVsPreviousMonth}
                                        </span>
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        {loading ? null : revenue ? (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {(
                                    [
                                        [t.adminRevenueToday, revenue.todayCents],
                                        [t.adminRevenueThisWeek, revenue.thisWeekCents],
                                        [t.adminRevenueThisMonth, revenue.thisMonthCents],
                                        [t.adminRevenueAllTime, revenue.allTimeCents],
                                    ] as const
                                ).map(([label, cents]) => (
                                    <div
                                        key={label}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                                    >
                                        <p className="text-[11px] text-slate-500">{label}</p>
                                        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-200">
                                            {formatUsdFromCents(cents)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-slate-500">{t.adminRevenueUnavailable}</p>
                        )}
                    </div>
                </div>

                <aside className={`${surface} p-4 sm:p-5 lg:col-span-4`}>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {t.quickActions}
                    </h3>
                    <div className="mt-3 flex flex-col gap-2">
                        {quickActions.map(({ Icon, title, description, view }) => (
                            <button
                                key={view}
                                type="button"
                                onClick={() => setActiveView(view)}
                                className={[
                                    "group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07]",
                                    "bg-white/[0.02] px-3 py-3 text-left transition duration-200",
                                    "hover:border-blue-400/35 hover:bg-blue-500/[0.08]",
                                    "active:scale-[0.99]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]",
                                ].join(" ")}
                            >
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/12 text-blue-300">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-100">
                                        {title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                        {description}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>
            </section>
        </div>
    )
}
