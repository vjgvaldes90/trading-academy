"use client"

import RecentActivityPanel from "@/components/admin/executive/RecentActivityPanel"
import UpcomingLiveSessionsPanel from "@/components/admin/executive/UpcomingLiveSessionsPanel"
import StudentGrowthChart from "@/components/admin/executive/StudentGrowthChart"
import MonthlyRevenueChart from "@/components/admin/executive/MonthlyRevenueChart"
import type { AdminDashboardView } from "@/components/admin/AdminSidebar"
import type { ActivityFeedItem } from "@/lib/activityFeed"
import type {
    ExecutiveMetrics,
    ExecutiveUpcomingSession,
    StudentGrowthPoint,
} from "@/lib/executiveDashboard"
import { useLanguage } from "@/context/LanguageProvider"
import { BookOpen, CalendarPlus, CreditCard, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type DashboardPayload = {
    metrics?: ExecutiveMetrics
    activity?: ActivityFeedItem[]
    upcomingSessions?: ExecutiveUpcomingSession[]
    studentGrowth?: StudentGrowthPoint[]
    error?: string
}

function formatMetricValue(
    value: number | null | undefined,
    opts?: { percent?: boolean; currency?: boolean }
): string {
    if (value == null || !Number.isFinite(value)) return "—"
    if (opts?.percent) return `${Math.round(value)}%`
    if (opts?.currency) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(value)
    }
    return String(value)
}

export default function AdminOverview({
    setActiveView,
}: {
    setActiveView: (view: AdminDashboardView) => void
}) {
    const { t } = useLanguage()
    const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null)
    const [activity, setActivity] = useState<ActivityFeedItem[]>([])
    const [upcoming, setUpcoming] = useState<ExecutiveUpcomingSession[]>([])
    const [growth, setGrowth] = useState<StudentGrowthPoint[]>([])
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
                setActivity(Array.isArray(payload.activity) ? payload.activity : [])
                setUpcoming(Array.isArray(payload.upcomingSessions) ? payload.upcomingSessions : [])
                setGrowth(Array.isArray(payload.studentGrowth) ? payload.studentGrowth : [])
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : t.failedToLoadOverview)
                    setMetrics(null)
                    setActivity([])
                    setUpcoming([])
                    setGrowth([])
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
                value: formatMetricValue(m?.totalStudents),
            },
            {
                label: t.adminActiveStudents,
                value: formatMetricValue(m?.activeStudents),
            },
            {
                label: t.adminLiveSessionsThisWeek,
                value: formatMetricValue(m?.liveSessionsThisWeek),
            },
            {
                label: t.adminOpenSupportTickets,
                value: formatMetricValue(m?.openSupportTickets),
            },
            {
                label: t.adminExpiringSubscriptions,
                value: formatMetricValue(m?.expiringSubscriptions),
            },
            {
                label: t.adminTotalBookedSeatsThisWeek,
                value: formatMetricValue(m?.totalBookedSeatsThisWeek ?? null),
            },
            {
                label: t.adminSeatOccupancy,
                value: formatMetricValue(m?.seatOccupancyPercent ?? null, { percent: true }),
            },
            {
                label: t.adminMonthlyRevenue,
                value: formatMetricValue(m?.monthlyRevenue ?? null, { currency: true }),
            },
        ]
    }, [metrics, t])

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

            {/* Row 1 — KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((c) => (
                    <div
                        key={c.label}
                        className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-500/25 hover:bg-white/[0.07]"
                    >
                        <p className="text-sm text-slate-400">{c.label}</p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">
                            {loading ? "…" : c.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Row 2 — Activity + Upcoming */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <RecentActivityPanel items={activity} loading={loading} />
                <UpcomingLiveSessionsPanel sessions={upcoming} loading={loading} />
            </div>

            {/* Row 3 — Charts */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <StudentGrowthChart points={growth} loading={loading} />
                <MonthlyRevenueChart />
            </div>

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
