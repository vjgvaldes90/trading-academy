"use client"

import AdminNotificationsBell from "@/components/admin/AdminNotificationsBell"
import type { AdminDashboardView } from "@/components/admin/AdminSidebar"
import type { AdminRevenueMetrics } from "@/lib/adminRevenue"
import { formatUsdFromCents } from "@/lib/adminRevenue"
import type { ExecutiveMetrics } from "@/lib/executiveDashboard"
import { useLanguage } from "@/context/LanguageProvider"
import {
    BookOpen,
    CalendarPlus,
    ChevronDown,
    ChevronRight,
    CreditCard,
    LifeBuoy,
    TrendingUp,
    UserPlus,
    Users,
    UserCheck,
    Zap,
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

const panel =
    "rounded-xl border border-white/[0.08] bg-[#111827]/90 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.8)]"

export default function AdminOverview({
    setActiveView,
}: {
    setActiveView: (view: AdminDashboardView) => void
}) {
    const { t, language } = useLanguage()
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

    const todayLabel = useMemo(() => {
        const locale = language === "es" ? "es-ES" : "en-US"
        return new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(new Date())
    }, [language])

    /** Four top cards (reference layout) — values from existing ExecutiveMetrics only. */
    const topCards = useMemo(() => {
        const m = metrics
        return [
            {
                label: t.adminTotalStudents,
                value: m?.totalStudents,
                Icon: Users,
                view: "students" as const,
                linkLabel: t.adminQuickViewStudents,
                featured: false,
            },
            {
                label: t.adminActiveStudents,
                value: m?.activeStudents,
                Icon: UserCheck,
                view: "students" as const,
                linkLabel: t.adminQuickViewStudents,
                featured: false,
            },
            {
                label: t.adminNewThisMonth,
                value: m?.newThisMonth,
                Icon: TrendingUp,
                view: "students" as const,
                linkLabel: t.adminQuickViewStudents,
                featured: true,
            },
            {
                label: t.adminOpenSupportTickets,
                value: m?.openSupportTickets,
                Icon: LifeBuoy,
                view: "support" as const,
                linkLabel: t.adminSupport,
                featured: false,
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
                Icon: CalendarPlus,
                title: t.adminQuickScheduleSession,
                view: "sessions" as const,
            },
            {
                Icon: BookOpen,
                title: t.adminTheoryPlanning,
                view: "theoryPlanning" as const,
            },
            {
                Icon: Users,
                title: t.adminQuickViewStudents,
                view: "students" as const,
            },
            {
                Icon: UserPlus,
                title: t.adminPrivateClassRequests,
                view: "privateClasses" as const,
            },
            {
                Icon: CreditCard,
                title: t.adminQuickManageSubscriptions,
                view: "subscriptions" as const,
            },
        ],
        [t]
    )

    return (
        <div className="space-y-6 lg:space-y-7">
            {/* Greeting + utilities — same row as reference */}
            <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
                        {t.welcome} {t.adminLabel}
                    </h2>
                    <p className="mt-1.5 max-w-xl text-sm text-slate-400">{t.adminOverviewSubtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-[#111827]/80 px-3.5 py-2 text-xs capitalize text-slate-300 sm:text-sm">
                        {todayLabel}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111827]/80 py-1.5 pl-1.5 pr-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                            A
                        </span>
                        <span className="text-sm font-medium text-slate-200">{t.adminLabel}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                    </div>
                    <AdminNotificationsBell />
                </div>
            </header>

            {error ? (
                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            {/* Four equal KPI cards — icon left like reference */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
                {topCards.map((card) => {
                    const Icon = card.Icon as LucideIcon
                    return (
                        <div
                            key={card.label}
                            className={[
                                panel,
                                "flex flex-col p-4 sm:p-5",
                                card.featured
                                    ? "border-amber-400/40 shadow-[0_0_0_1px_rgba(245,158,11,0.14)]"
                                    : "",
                            ].join(" ")}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={[
                                        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                                        card.featured
                                            ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
                                            : "border-blue-400/25 bg-blue-500/15 text-blue-300",
                                    ].join(" ")}
                                >
                                    <Icon className="h-5 w-5" aria-hidden />
                                </span>
                                <p className="pt-1.5 text-sm font-medium leading-snug text-slate-300">
                                    {card.label}
                                </p>
                            </div>
                            <p className="mt-5 text-3xl font-bold tabular-nums tracking-tight text-white">
                                {loading ? "…" : card.value ?? "—"}
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveView(card.view)}
                                className={[
                                    "mt-auto pt-4 inline-flex items-center gap-1 self-start text-sm font-semibold transition",
                                    card.featured
                                        ? "text-amber-300 hover:text-amber-200"
                                        : "text-blue-400 hover:text-blue-300",
                                ].join(" ")}
                            >
                                {card.linkLabel}
                                <span aria-hidden>→</span>
                            </button>
                        </div>
                    )
                })}
            </section>

            {/* 2/3 + 1/3 body — existing data mapped into reference slots */}
            <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
                <div className="flex flex-col gap-4 lg:col-span-8">
                    {/* Maps to “Próximas sesiones” slot — revenue is the existing primary dataset */}
                    <div className={`${panel} flex min-h-[260px] flex-col p-5 sm:min-h-[280px] sm:p-6`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/15 text-blue-300">
                                    <CreditCard className="h-4 w-4" aria-hidden />
                                </span>
                                <h3 className="text-base font-semibold text-white">{t.adminRevenue}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveView("subscriptions")}
                                className="inline-flex items-center rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/10"
                            >
                                {t.adminQuickManageSubscriptions}
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex flex-1 items-center justify-center py-10">
                                <p className="text-3xl font-bold text-white">…</p>
                            </div>
                        ) : revenue ? (
                            <div className="mt-6 flex flex-1 flex-col">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500">{t.adminRevenueThisMonth}</p>
                                        <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                                            {formatUsdFromCents(revenue.thisMonthCents)}
                                        </p>
                                    </div>
                                    <p
                                        className={[
                                            "text-sm font-semibold tabular-nums",
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
                                <div className="mt-auto grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
                                    {(
                                        [
                                            [t.adminRevenueToday, revenue.todayCents],
                                            [t.adminRevenueThisWeek, revenue.thisWeekCents],
                                            [t.adminRevenueThisMonth, revenue.thisMonthCents],
                                            [t.adminRevenueAllTime, revenue.allTimeCents],
                                        ] as const
                                    ).map(([label, cents]) => (
                                        <div key={label}>
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                                                {label}
                                            </p>
                                            <p className="mt-1 text-sm font-semibold tabular-nums text-slate-200">
                                                {formatUsdFromCents(cents)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-500">
                                    <CreditCard className="h-7 w-7" aria-hidden />
                                </span>
                                <p className="text-sm text-slate-400">{t.adminRevenueUnavailable}</p>
                                <button
                                    type="button"
                                    onClick={() => setActiveView("subscriptions")}
                                    className="mt-1 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                                >
                                    {t.adminQuickManageSubscriptions}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Maps to “Estudiantes recientes” slot — newThisWeek metric */}
                    <div className={`${panel} p-5 sm:p-6`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/15 text-blue-300">
                                    <Users className="h-4 w-4" aria-hidden />
                                </span>
                                <h3 className="text-base font-semibold text-white">{t.adminNewThisWeek}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveView("students")}
                                className="inline-flex items-center rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/10"
                            >
                                {t.adminQuickViewStudents}
                            </button>
                        </div>
                        <div className="mt-8 flex flex-col items-center justify-center gap-2 py-4 text-center sm:mt-6 sm:flex-row sm:items-end sm:justify-between sm:text-left">
                            <p className="text-4xl font-bold tabular-nums text-white">
                                {loading ? "…" : metrics?.newThisWeek ?? "—"}
                            </p>
                            <p className="max-w-[16rem] text-xs leading-relaxed text-slate-500 sm:text-right">
                                {t.adminQuickViewStudentsDesc}
                            </p>
                        </div>
                    </div>
                </div>

                <aside className="flex flex-col gap-4 lg:col-span-4">
                    <div className={`${panel} p-5`}>
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/15 text-amber-300">
                                <Zap className="h-4 w-4" aria-hidden />
                            </span>
                            <h3 className="text-base font-semibold text-white">{t.quickActions}</h3>
                        </div>
                        <ul className="mt-4 space-y-1">
                            {quickActions.map(({ Icon, title, view }) => (
                                <li key={view}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveView(view)}
                                        className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition hover:border-white/[0.08] hover:bg-white/[0.04]"
                                    >
                                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-500/10 text-blue-300">
                                            <Icon className="h-4 w-4" aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                                            {title}
                                        </span>
                                        <ChevronRight
                                            className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-400"
                                            aria-hidden
                                        />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </section>
        </div>
    )
}
