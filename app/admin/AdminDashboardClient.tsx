"use client"

import AdminAnalytics from "@/components/admin/AdminAnalytics"
import AdminAnnouncements from "@/components/admin/AdminAnnouncements"
import AdminClasses from "@/components/admin/AdminClasses"
import AdminNotificationsBell from "@/components/admin/AdminNotificationsBell"
import AdminOverview from "@/components/admin/AdminOverview"
import AdminPrivateClassRequests from "@/components/admin/AdminPrivateClassRequests"
import AdminSessions from "@/components/admin/AdminSessions"
import AdminSettings from "@/components/admin/AdminSettings"
import AdminSidebar, { type AdminDashboardView } from "@/components/admin/AdminSidebar"
import AdminStudents from "@/components/admin/AdminStudents"
import AdminSubscriptions from "@/components/admin/AdminSubscriptions"
import AdminSupport from "@/components/admin/AdminSupport"
import AdminTheoryPlanning from "@/components/admin/AdminTheoryPlanning"
import BackToDashboardButton from "@/components/dashboard/BackToDashboardButton"
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
            theoryPlanning: t.adminTheoryPlanning,
            privateClasses: t.adminPrivateClassRequests,
            students: t.adminStudents,
            subscriptions: t.adminSubscriptions,
            support: t.adminSupport,
            announcements: t.adminAnnouncements,
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
        <div className={`flex min-h-screen bg-[#0B0F19] text-white ${dashboardTheme.shell}`}>
            <AdminSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                openSupportCount={openSupportCount}
            />

            <main className="ml-0 flex-1 p-5 pt-[4.25rem] lg:ml-[15.5rem] lg:p-8 lg:pt-8">
                {/* Overview owns its own header chrome (greeting + date + admin + bell). */}
                {activeView !== "overview" ? (
                    <header className="mb-5 flex items-center justify-end gap-4 lg:mb-6">
                        <AdminNotificationsBell />
                    </header>
                ) : null}

                <div
                    key={activeView}
                    className={`${dashboardTheme.viewEnter} ${
                        activeView === "overview" ||
                        activeView === "sessions" ||
                        activeView === "theoryPlanning" ||
                        activeView === "privateClasses" ||
                        activeView === "support" ||
                        activeView === "announcements"
                            ? "max-w-7xl"
                            : "max-w-6xl"
                    }`}
                >
                    {activeView !== "overview" ? (
                        <>
                            {activeView !== "sessions" ? (
                                <h1 className="mb-4 text-lg font-bold tracking-tight text-slate-100 lg:text-xl">
                                    {sectionTitles[activeView]}
                                </h1>
                            ) : null}
                            <BackToDashboardButton onBack={() => setActiveView("overview")} />
                        </>
                    ) : null}
                    {activeView === "overview" ? <AdminOverview setActiveView={setActiveView} /> : null}
                    {activeView === "classes" ? <AdminClasses /> : null}
                    {activeView === "sessions" ? <AdminSessions /> : null}
                    {activeView === "theoryPlanning" ? <AdminTheoryPlanning /> : null}
                    {activeView === "privateClasses" ? <AdminPrivateClassRequests /> : null}
                    {activeView === "students" ? <AdminStudents /> : null}
                    {activeView === "subscriptions" ? <AdminSubscriptions /> : null}
                    {activeView === "support" ? (
                        <AdminSupport onOpenCountChange={setOpenSupportCount} />
                    ) : null}
                    {activeView === "announcements" ? <AdminAnnouncements /> : null}
                    {activeView === "analytics" ? <AdminAnalytics /> : null}
                    {activeView === "settings" ? <AdminSettings /> : null}
                </div>
            </main>
        </div>
    )
}
