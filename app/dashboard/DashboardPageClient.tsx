"use client"

import DashboardHeader from "@/components/dashboard/DashboardHeader"
import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import Sidebar from "@/components/student/Sidebar"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import type { StudentDashboardView } from "@/components/student/Sidebar"
import AnnouncementBanner from "@/components/dashboard/AnnouncementBanner"
import AnnouncementsView from "@/components/dashboard/AnnouncementsView"
import DashboardHome from "@/components/dashboard/DashboardHome"
import ClassesView from "@/components/dashboard/ClassesView"
import LiveSessionsView from "@/components/dashboard/LiveSessionsView"
import Resources from "@/components/dashboard/Resources"
import Settings from "@/components/dashboard/Settings"
import SupportView from "@/components/dashboard/support/SupportView"
import { useLanguage } from "@/context/LanguageProvider"
import { SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END } from "@/lib/subscriptionCancellation"
import type { StudentAnnouncementItem, StudentAnnouncementsPayload } from "@/lib/announcements"
import { SessionProvider, useSession } from "@/context/SessionContext"
import { supabase } from "@/lib/supabase"
import {
    clearStoredStudent,
    persistStudent,
    readStoredStudent,
    resolveDashboardStudent,
} from "@/lib/studentLocalStorage"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useState } from "react"

type DashboardUserSubscription = {
    email: string
    subscription_id: string | null
    subscription_status: string | null
}

function DashboardShell({
    welcomeName,
    user,
}: {
    welcomeName: string
    user: DashboardUserSubscription | null
}) {
    const router = useRouter()
    const { t } = useLanguage()
    const { dashboardDataReady } = useSession()
    const [activeView, setActiveView] = useState<StudentDashboardView>("dashboard")
    const [isCancelling, setIsCancelling] = useState(false)
    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [announcements, setAnnouncements] = useState<StudentAnnouncementItem[]>([])
    const [announcementsLoading, setAnnouncementsLoading] = useState(true)
    const [announcementsError, setAnnouncementsError] = useState(false)
    const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0)
    const [focusAnnouncementId, setFocusAnnouncementId] = useState<string | null>(null)

    const loadAnnouncements = useCallback(async () => {
        setAnnouncementsLoading(true)
        setAnnouncementsError(false)
        try {
            const res = await fetch("/api/student/announcements", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as {
                ok?: unknown
                data?: StudentAnnouncementsPayload
            }
            if (!res.ok || payload.ok !== true || !payload.data) {
                setAnnouncements([])
                setUnreadAnnouncementsCount(0)
                setAnnouncementsError(true)
                return
            }
            setAnnouncements(payload.data.announcements)
            setUnreadAnnouncementsCount(payload.data.unreadCount)
        } catch {
            setAnnouncements([])
            setUnreadAnnouncementsCount(0)
            setAnnouncementsError(true)
        } finally {
            setAnnouncementsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!dashboardDataReady) return
        void loadAnnouncements()
    }, [dashboardDataReady, loadAnnouncements])

    const criticalBanner = useMemo(
        () => announcements.find((a) => a.priority === "critical") ?? null,
        [announcements]
    )

    const acknowledgeAnnouncement = useCallback(
        async (announcement: StudentAnnouncementItem) => {
            setAnnouncements((prev) => prev.filter((row) => row.id !== announcement.id))
            setUnreadAnnouncementsCount((prev) => Math.max(0, prev - 1))
            setFocusAnnouncementId((prev) => (prev === announcement.id ? null : prev))
            try {
                const res = await fetch("/api/student/announcements/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({ announcementId: announcement.id }),
                })
                const payload = (await res.json().catch(() => ({}))) as { ok?: unknown }
                if (!res.ok || payload.ok !== true) {
                    await loadAnnouncements()
                }
            } catch {
                await loadAnnouncements()
            }
        },
        [loadAnnouncements]
    )

    const openAnnouncementFromBanner = useCallback((announcement: StudentAnnouncementItem) => {
        setFocusAnnouncementId(announcement.id)
        setActiveView("announcements")
    }, [])

    const openAnnouncementsList = useCallback(() => {
        setFocusAnnouncementId(null)
        setActiveView("announcements")
    }, [])

    if (!dashboardDataReady) {
        return (
            <div
                className={`${dashboardTheme.shell} ${dashboardTheme.loadingFlex}`}
                aria-busy="true"
                aria-label={t.loadingCalendar}
            />
        )
    }

    const showCancelButton = Boolean(
        user?.subscription_id && user.subscription_status === "active"
    )
    const subscriptionPendingCancel = user?.subscription_status === SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END

    const sectionTitles: Record<StudentDashboardView, string> = {
        dashboard: t.navDashboard,
        classes: t.navMyClasses,
        live: t.navLiveSessions,
        resources: t.navResources,
        support: t.navSupport,
        announcements: t.navAnnouncements,
        settings: t.navSettings,
    }

    const handleLogout = () => {
        clearStoredStudent()
        router.replace("/login")
    }

    const handleCancelSubscription = async () => {
        if (!user?.email || isCancelling) return

        setIsCancelling(true)
        try {
            const res = await fetch("/api/cancel-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: user.email }),
            })
            if (!res.ok) {
                alert(t.errorCancellingSubscription)
                return
            }
            const data = (await res.json().catch(() => ({}))) as {
                ok?: unknown
                access_until?: string
            }
            if (data.ok !== true) {
                alert(t.errorCancellingSubscription)
                return
            }
            const until =
                typeof data.access_until === "string" && data.access_until.trim()
                    ? new Date(data.access_until).toLocaleDateString()
                    : null
            const policy = t.cancelSubscriptionPolicy
            alert(
                until
                    ? t.subscriptionEndWithDate.replace("{date}", until).replace("{policy}", policy)
                    : t.subscriptionEndNoDate.replace("{policy}", policy)
            )
            window.location.reload()
        } catch {
            alert(t.errorCancellingSubscription)
        } finally {
            setIsCancelling(false)
        }
    }

    return (
        <div
            className={`flex min-h-screen text-white bg-[#0B1120] ${dashboardTheme.shell}`}
            style={{ background: "#0B1120" }}
        >
            <Sidebar
                userName={welcomeName}
                roleLabel={t.roleStudent}
                activeView={activeView}
                setActiveView={setActiveView}
                unreadAnnouncementsCount={unreadAnnouncementsCount}
            />

            <main className="flex-1 ml-0 lg:ml-64 p-8 space-y-6">
                <AnimatePresence initial={false}>
                    {criticalBanner ? (
                        <motion.div
                            key={criticalBanner.id}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="overflow-hidden"
                        >
                            <AnnouncementBanner
                                announcement={criticalBanner}
                                onReadNow={openAnnouncementFromBanner}
                                onAcknowledge={acknowledgeAnnouncement}
                            />
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <DashboardHeader welcomeName={welcomeName} sectionTitle={sectionTitles[activeView]} />

                <div key={activeView} className={`${dashboardTheme.contentMax} ${dashboardTheme.viewEnter}`}>
                    {activeView === "dashboard" ? (
                        <DashboardHome
                            userName={welcomeName}
                            onWatchNow={() => setActiveView("classes")}
                            activeView={activeView}
                            setActiveView={setActiveView}
                            pendingAnnouncements={announcements}
                            onViewAnnouncements={openAnnouncementsList}
                            onReadAnnouncement={openAnnouncementFromBanner}
                            onDismissAnnouncement={acknowledgeAnnouncement}
                        />
                    ) : null}
                    {activeView === "classes" ? <ClassesView /> : null}
                    {activeView === "live" ? <LiveSessionsView /> : null}
                    {activeView === "resources" ? <Resources /> : null}
                    {activeView === "support" ? <SupportView /> : null}
                    {activeView === "announcements" ? (
                        <AnnouncementsView
                            announcements={announcements}
                            loading={announcementsLoading}
                            error={announcementsError}
                            focusAnnouncementId={focusAnnouncementId}
                            onRetry={() => void loadAnnouncements()}
                            onAcknowledge={acknowledgeAnnouncement}
                        />
                    ) : null}
                    {activeView === "settings" ? (
                        <Settings
                            showCancelSubscription={showCancelButton}
                            subscriptionPendingCancel={subscriptionPendingCancel}
                            onCancelSubscription={() => setCancelModalOpen(true)}
                            onLogout={handleLogout}
                            isCancellingSubscription={isCancelling}
                        />
                    ) : null}
                </div>
            </main>
            <CancelSessionConfirmModal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleCancelSubscription}
                title={t.cancelSubscriptionTitle}
                description={`${t.cancelSubscriptionPolicy} ${t.cancelSubscriptionAccessNote}`}
                confirmText={t.cancelSubscriptionConfirm}
            />
        </div>
    )
}

/**
 * Entire dashboard UI: no RSC, no `/api/student-self`, no server Supabase for this tree.
 */
export default function DashboardPageClient() {
    const router = useRouter()
    const { t } = useLanguage()
    const [ready, setReady] = useState(false)
    const [welcomeName, setWelcomeName] = useState("")
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [user, setUser] = useState<DashboardUserSubscription | null>(null)

    useEffect(() => {
        const student = resolveDashboardStudent()
        if (!student) {
            router.replace("/login?redirect=/dashboard")
            return
        }
        if (!readStoredStudent()) {
            persistStudent(student)
        }

        const email = student.email.trim().toLowerCase()
        let cancelled = false

        void (async () => {
            try {
                const res = await fetch(
                    `/api/student/access?user_email=${encodeURIComponent(email)}`,
                    { credentials: "include", cache: "no-store" }
                )
                const data = (await res.json().catch(() => ({}))) as {
                    ok?: unknown
                    message?: string
                    reason?: string
                }
                if (cancelled) return
                if (data.ok !== true) {
                    if (data.reason === "expired") {
                        router.replace("/expired")
                        return
                    }
                    if (data.reason === "inactive") {
                        clearStoredStudent()
                        router.replace("/blocked")
                        return
                    }
                    clearStoredStudent()
                    router.replace("/login?redirect=/dashboard&error=access_denied")
                    return
                }
                setWelcomeName(student.name)
                setUserEmail(email)
                const { data: row, error: studentErr } = await supabase
                    .from("trading_students")
                    .select("email, subscription_id, subscription_status")
                    .eq("email", email)
                    .maybeSingle()
                if (studentErr) {
                    console.error("[dashboard] failed to load subscription info", studentErr)
                    setUser({ email, subscription_id: null, subscription_status: null })
                } else {
                    const rec = (row ?? {}) as Record<string, unknown>
                    setUser({
                        email,
                        subscription_id:
                            typeof rec.subscription_id === "string" && rec.subscription_id.trim()
                                ? rec.subscription_id
                                : null,
                        subscription_status:
                            typeof rec.subscription_status === "string" && rec.subscription_status.trim()
                                ? rec.subscription_status
                                : null,
                    })
                }
                setReady(true)
            } catch {
                if (!cancelled) {
                    clearStoredStudent()
                    router.replace("/login?redirect=/dashboard&error=access_denied")
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [router])

    if (!ready || !userEmail) {
        return (
            <div
                className={`${dashboardTheme.shell} ${dashboardTheme.loadingFlex}`}
                aria-busy="true"
                aria-label={t.loadingDashboard}
            />
        )
    }

    return (
        <SessionProvider
            initialSessions={[]}
            initialAcademyAccess={{
                canAccess: false,
                message: null,
                actor: { email: userEmail },
            }}
            initialUserEmail={userEmail}
        >
            <DashboardShell welcomeName={welcomeName} user={user} />
        </SessionProvider>
    )
}
