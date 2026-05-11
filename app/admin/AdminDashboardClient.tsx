"use client"

import AdminAnalytics from "@/components/admin/AdminAnalytics"
import AdminClasses from "@/components/admin/AdminClasses"
import AdminOverview from "@/components/admin/AdminOverview"
import AdminSessions from "@/components/admin/AdminSessions"
import AdminSettings from "@/components/admin/AdminSettings"
import AdminSidebar, { type AdminDashboardView } from "@/components/admin/AdminSidebar"
import AdminStudents from "@/components/admin/AdminStudents"
import AdminSubscriptions from "@/components/admin/AdminSubscriptions"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import { useEffect, useState } from "react"

const SECTION_TITLES: Record<AdminDashboardView, string> = {
    overview: "Overview",
    classes: "Recorded Classes",
    sessions: "Live Sessions",
    students: "Students",
    subscriptions: "Subscriptions",
    analytics: "Analytics",
    settings: "Settings",
}

export default function AdminDashboardClient({
    initialView,
}: {
    initialView?: AdminDashboardView
}) {
    const [activeView, setActiveView] = useState<AdminDashboardView>(initialView ?? "overview")

    useEffect(() => {
        if (initialView) setActiveView(initialView)
    }, [initialView])

    return (
        <div className={`flex min-h-screen bg-[#0B1120] text-white ${dashboardTheme.shell}`}>
            <AdminSidebar activeView={activeView} setActiveView={setActiveView} />

            <main className="flex-1 ml-0 lg:ml-64 p-6 lg:p-8">
                {activeView !== "sessions" ? (
                    <header className="mb-6 border-b border-white/10 pb-4">
                        <h1 className="text-lg font-bold tracking-tight text-slate-100 lg:text-xl">
                            {SECTION_TITLES[activeView]}
                        </h1>
                    </header>
                ) : null}

                <div key={activeView} className={`${dashboardTheme.viewEnter} ${activeView === "sessions" ? "max-w-7xl" : "max-w-6xl"}`}>
                    {activeView === "overview" ? <AdminOverview setActiveView={setActiveView} /> : null}
                    {activeView === "classes" ? <AdminClasses /> : null}
                    {activeView === "sessions" ? <AdminSessions /> : null}
                    {activeView === "students" ? <AdminStudents /> : null}
                    {activeView === "subscriptions" ? <AdminSubscriptions /> : null}
                    {activeView === "analytics" ? <AdminAnalytics /> : null}
                    {activeView === "settings" ? <AdminSettings /> : null}
                </div>
            </main>
        </div>
    )
}
