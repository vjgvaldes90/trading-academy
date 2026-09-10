"use client"

import StudentGrowthChart from "@/components/admin/executive/StudentGrowthChart"
import type { AdminDashboardView } from "@/components/admin/AdminSidebar"
import type { AdminRevenueMetrics } from "@/lib/adminRevenue"
import { formatUsdFromCents } from "@/lib/adminRevenue"
import type { ExecutiveMetrics, StudentGrowthPoint } from "@/lib/executiveDashboard"
import { useLanguage } from "@/context/LanguageProvider"
import { BookOpen, CalendarPlus, CreditCard, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type DashboardPayload = {
    metrics?: ExecutiveMetrics
    studentGrowth?: StudentGrowthPoint[]
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

export default function AdminOverview({
    setActiveView,
}: {
    setActiveView: (view: AdminDashboardView) => void
}) {
    const { t } = useLanguage()
    const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null)
    const [growth, setGrowth] = useState<StudentGrowthPoint[]>([])
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
                setGrowth(Array.isArray(payload.studentGrowth) ? payload.studentGrowth : [])
                setRevenue(payload.revenue ?? null)
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : t.failedToLoadOverview)
                    setMetrics(null)
                    setGrowth([])
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
            { label: t.adminTotalStudents, value: m?.totalStudents },
            { label: t.adminActiveStudents, value: m?.activeStudents },
            { label: t.adminNewThisWeek, value: m?.newThisWeek },
            { label: t.adminNewThisMonth, value: m?.newThisMonth },
            { label: t.adminOpenSupportTickets, value: m?.openSupportTickets },
        ]
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
        <div className="space-y-8">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">{t.adminExecutiveDashboard}</h2>
                <p className="mt-1 text-sm text-slate-400">{t.adminExecutiveDashboardSubtitle}</p>
            </header>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {statCards.map((c) => (
                    <div
                        key={c.label}
                        className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-500/25 hover:bg-white/[0.07]"
                    >
                        <p className="text-sm text-slate-400">{c.label}</p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">
                            {loading ? "…" : c.value ?? "—"}
                        </p>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-500/25 hover:bg-white/[0.07] sm:max-w-xl">
                <p className="text-sm text-slate-400">{t.adminRevenue}</p>
                {loading ? (
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">…</p>
                ) : revenue ? (
                    <>
                        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">
                            {formatUsdFromCents(revenue.thisMonthCents)}
                        </p>
                        <dl className="mt-4 space-y-1.5 text-sm text-slate-400">
                            <div className="flex items-baseline justify-between gap-3">
                                <dt>{t.adminRevenueToday}</dt>
                                <dd className="tabular-nums font-medium text-slate-200">
                                    {formatUsdFromCents(revenue.todayCents)}
                                </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                                <dt>{t.adminRevenueThisWeek}</dt>
                                <dd className="tabular-nums font-medium text-slate-200">
                                    {formatUsdFromCents(revenue.thisWeekCents)}
                                </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                                <dt>{t.adminRevenueThisMonth}</dt>
                                <dd className="tabular-nums font-medium text-slate-200">
                                    {formatUsdFromCents(revenue.thisMonthCents)}
                                </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                                <dt>{t.adminRevenueAllTime}</dt>
                                <dd className="tabular-nums font-medium text-slate-200">
                                    {formatUsdFromCents(revenue.allTimeCents)}
                                </dd>
                            </div>
                        </dl>
                        <p
                            className={[
                                "mt-4 text-sm font-semibold tabular-nums",
                                mom.tone === "up"
                                    ? "text-emerald-400"
                                    : mom.tone === "down"
                                      ? "text-rose-400"
                                      : "text-slate-400",
                            ].join(" ")}
                        >
                            {mom.text}
                            {mom.tone !== "na" ? (
                                <span className="ml-1.5 font-medium text-slate-500">
                                    {t.adminRevenueVsPreviousMonth}
                                </span>
                            ) : (
                                <span className="ml-1.5 font-medium text-slate-500">
                                    {t.adminRevenueVsPreviousMonth}
                                </span>
                            )}
                        </p>
                    </>
                ) : (
                    <p className="mt-2 text-sm text-slate-500">{t.adminRevenueUnavailable}</p>
                )}
            </div>

            <StudentGrowthChart points={growth} loading={loading} />

            <section>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-300">
                    {t.quickActions}
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {quickActions.map(({ Icon, title, description, view }) => (
                        <button
                            key={view}
                            type="button"
                            onClick={() => setActiveView(view)}
                            className={[
                                "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-white/10",
                                "bg-white/5 p-6 text-center transition-all duration-200",
                                "hover:scale-[1.03] hover:border-blue-500/30 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
                                "active:scale-[0.98]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]",
                            ].join(" ")}
                        >
                            <Icon className="h-8 w-8 shrink-0 text-blue-400 transition-transform duration-200 group-hover:scale-110" />
                            <div className="flex w-full flex-col gap-1">
                                <span className="text-sm font-extrabold leading-snug text-slate-100">
                                    {title}
                                </span>
                                <span className="text-xs leading-snug text-slate-400">{description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    )
}
