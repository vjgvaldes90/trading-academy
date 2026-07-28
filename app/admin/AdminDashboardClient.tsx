"use client"

import AdminAnalytics from "@/components/admin/AdminAnalytics"
import AdminClasses from "@/components/admin/AdminClasses"
import AdminNotificationsBell from "@/components/admin/AdminNotificationsBell"
import AdminOverview from "@/components/admin/AdminOverview"
import AdminSessions from "@/components/admin/AdminSessions"
import AdminSettings from "@/components/admin/AdminSettings"
import AdminSidebar, { type AdminDashboardView } from "@/components/admin/AdminSidebar"
import AdminStudents from "@/components/admin/AdminStudents"
import AdminSubscriptions from "@/components/admin/AdminSubscriptions"
import AdminSupport from "@/components/admin/AdminSupport"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import { useLanguage } from "@/context/LanguageProvider"
import { getAdminSupportStatusCountsAction } from "@/app/actions/support"
import { useCallback, useEffect, useMemo, useState } from "react"

export default function AdminDashboardClient({
    initialView,
}: {
    initialView?: AdminDashboardView
}) {
    const { t } = useLanguage()
    const [activeView, setActiveView] = useState<AdminDashboardView>(initialView ?? "overview")
    const [openSupportCount, setOpenSupportCount] = useState(0)

    const sectionTitles = useMemo<Record<AdminDashboardView, string>>(
        () => ({
            overview: t.adminOverview,
            classes: t.adminRecordedClasses,
            sessions: t.adminLiveSessions,
            students: t.adminStudents,
            subscriptions: t.adminSubscriptions,
            support: t.adminSupport,
            analytics: t.adminAnalytics,
            settings: t.adminSettings,
        }),
        [t]
    )

    const refreshOpenCount = useCallback(async () => {
        try {
            const result = await getAdminSupportStatusCountsAction()
            if (result.ok) setOpenSupportCount(result.data.open)
        } catch {
            // Keep last known badge count on transient failures.
        }
    }, [])

    useEffect(() => {
        if (initialView) setActiveView(initialView)
    }, [initialView])

    useEffect(() => {
        void refreshOpenCount()
        const id = window.setInterval(() => {
            void refreshOpenCount()
        }, 60_000)
        return () => window.clearInterval(id)
    }, [refreshOpenCount])

    return (
        <div className={`flex min-h-screen bg-[#0B1120] text-white ${dashboardTheme.shell}`}>
            <AdminSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                openSupportCount={openSupportCount}
            />

            <main className="flex-1 ml-0 lg:ml-64 p-6 lg:p-8">
                <header className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    {activeView !== "sessions" ? (
                        <h1 className="text-lg font-bold tracking-tight text-slate-100 lg:text-xl">
                            {sectionTitles[activeView]}
                        </h1>
                    ) : (
                        <div className="min-w-0 flex-1" />
                    )}
                    <AdminNotificationsBell />
                </header>

                <div
                    key={activeView}
                    className={`${dashboardTheme.viewEnter} ${
                        activeView === "sessions" || activeView === "support" ? "max-w-7xl" : "max-w-6xl"
                    }`}
                >
                    {activeView === "overview" ? <AdminOverview setActiveView={setActiveView} /> : null}
                    {activeView === "classes" ? <AdminClasses /> : null}
                    {activeView === "sessions" ? <AdminSessions /> : null}
                    {activeView === "students" ? <AdminStudents /> : null}
                    {activeView === "subscriptions" ? <AdminSubscriptions /> : null}
                    {activeView === "support" ? (
                        <AdminSupport onOpenCountChange={setOpenSupportCount} />
                    ) : null}
                    {activeView === "analytics" ? <AdminAnalytics /> : null}
                    {activeView === "settings" ? <AdminSettings /> : null}
                </div>
            </main>
        </div>
    )
}
