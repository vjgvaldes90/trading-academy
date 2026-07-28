"use client"

import type { AdminDashboardView } from "@/components/admin/AdminSidebar"
import { useLanguage } from "@/context/LanguageProvider"
import { BookOpen, CalendarPlus, CreditCard, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type Metrics = {
    totalStudents: number
    activeSubscriptions: number
    totalClasses: number
    upcomingSessions: number
}

function sessionStartInFuture(date: string | null, time: string | null, now: Date): boolean {
    if (!date || !time) return false
    const dt = new Date(`${date.trim()}T${time.trim()}`)
    if (Number.isNaN(dt.getTime())) return false
    return dt.getTime() > now.getTime()
}

export default function AdminOverview({
    setActiveView,
}: {
    setActiveView: (view: AdminDashboardView) => void
}) {
    const { t } = useLanguage()
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError(null)
            const now = new Date()
            try {
                const [studentsRes, lessonsRes, sessionsRes] = await Promise.all([
                    fetch("/api/admin/trading-students", { cache: "no-store", credentials: "include" }),
                    fetch("/api/lessons", { cache: "no-store", credentials: "include" }),
                    fetch("/api/admin/sessions", { cache: "no-store", credentials: "include" }),
                ])

                const studentsPayload = (await studentsRes.json().catch(() => [])) as unknown
                const lessonsPayload = (await lessonsRes.json().catch(() => [])) as unknown
                const sessionsPayload = (await sessionsRes.json().catch(() => [])) as unknown

                if (!studentsRes.ok) throw new Error(t.adminFailedToLoadStudents)
                if (!lessonsRes.ok) throw new Error(t.adminFailedToLoadClasses)
                if (!sessionsRes.ok) throw new Error(t.adminFailedToLoadSessions)

                const studentList = Array.isArray(studentsPayload) ? studentsPayload : []
                const totalStudents = studentList.length
                const activeSubscriptions = studentList.filter((r: Record<string, unknown>) => {
                    const st = typeof r.subscription_status === "string" ? r.subscription_status.toLowerCase() : ""
                    return st === "active"
                }).length

                const lessons = Array.isArray(lessonsPayload) ? lessonsPayload : []
                const totalClasses = lessons.length

                const sessions = Array.isArray(sessionsPayload) ? sessionsPayload : []
                const upcomingSessions = sessions.filter((s: Record<string, unknown>) => {
                    const status = typeof s.status === "string" ? s.status : "active"
                    if (status !== "active") return false
                    return sessionStartInFuture(
                        typeof s.date === "string" ? s.date : null,
                        typeof s.time === "string" ? s.time : null,
                        now
                    )
                }).length

                if (!cancelled) {
                    setMetrics({ totalStudents, activeSubscriptions, totalClasses, upcomingSessions })
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : t.failedToLoadOverview)
                    setMetrics(null)
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
        () =>
            metrics
                ? [
                      { label: t.adminTotalStudents, value: metrics.totalStudents },
                      { label: t.adminActiveSubscriptions, value: metrics.activeSubscriptions },
                      { label: t.adminTotalClasses, value: metrics.totalClasses },
                      { label: t.adminUpcomingSessions, value: metrics.upcomingSessions },
                  ]
                : [],
        [metrics, t]
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
                <h2 className="text-xl font-semibold text-slate-50">{t.adminOverview}</h2>
                <p className="mt-1 text-sm text-slate-400">{t.adminOverviewSubtitle}</p>
            </header>

            {loading ? (
                <p className="text-sm text-slate-400">{t.loadingMetrics}</p>
            ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((c) => (
                        <div
                            key={c.label}
                            className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/25 hover:bg-white/[0.07]"
                        >
                            <p className="text-sm text-slate-400">{c.label}</p>
                            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">{c.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <section>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-300">{t.quickActions}</h3>
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
                                <span className="text-sm font-extrabold leading-snug text-slate-100">{title}</span>
                                <span className="text-xs leading-snug text-slate-400">{description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    )
}
