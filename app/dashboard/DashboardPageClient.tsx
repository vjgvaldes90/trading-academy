"use client"

import DashboardHeader from "@/components/dashboard/DashboardHeader"
import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import Sidebar from "@/components/student/Sidebar"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import type { StudentDashboardView } from "@/components/student/Sidebar"
import DashboardHome from "@/components/dashboard/DashboardHome"
import ClassesView from "@/components/dashboard/ClassesView"
import ReserveSession from "@/components/dashboard/ReserveSession"
import MyReservations from "@/components/dashboard/MyReservations"
import Resources from "@/components/dashboard/Resources"
import Settings from "@/components/dashboard/Settings"
import { SessionProvider, useSession } from "@/context/SessionContext"
import { supabase } from "@/lib/supabase"
import {
    clearStoredStudent,
    persistStudent,
    readStoredStudent,
    resolveDashboardStudent,
} from "@/lib/studentLocalStorage"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
    const { dashboardDataReady } = useSession()
    const [activeView, setActiveView] = useState<StudentDashboardView>("dashboard")
    const [isCancelling, setIsCancelling] = useState(false)
    const [cancelModalOpen, setCancelModalOpen] = useState(false)

    if (!dashboardDataReady) {
        return (
            <div
                className={`${dashboardTheme.shell} ${dashboardTheme.loadingFlex}`}
                aria-busy="true"
                aria-label="Cargando calendario"
            />
        )
    }

    const showCancelButton = Boolean(user?.subscription_id && user.subscription_status === "active")

    const sectionTitles: Record<StudentDashboardView, string> = {
        dashboard: "Dashboard",
        classes: "Mis Clases",
        reserve: "Reservar Sesión",
        "my-reservations": "Mis Reservas",
        resources: "Recursos",
        settings: "Configuración",
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
                alert("Error cancelling subscription")
                return
            }
            const data = (await res.json().catch(() => ({}))) as { ok?: unknown }
            if (data.ok !== true) {
                alert("Error cancelling subscription")
                return
            }
            alert("Subscription cancelled successfully")
            window.location.reload()
        } catch {
            alert("Error cancelling subscription")
        } finally {
            setIsCancelling(false)
        }
    }

    return (
        <div
            className={`flex min-h-screen text-white bg-[#0B1120] ${dashboardTheme.shell}`}
            style={{ background: "#0B1120" }}
        >
            <Sidebar userName={welcomeName} roleLabel="Alumno" activeView={activeView} setActiveView={setActiveView} />

            <main className="flex-1 ml-0 lg:ml-64 p-8 space-y-6">
                <DashboardHeader welcomeName={welcomeName} sectionTitle={sectionTitles[activeView]} />

                <div key={activeView} className={`${dashboardTheme.contentMax} ${dashboardTheme.viewEnter}`}>
                    {activeView === "dashboard" ? (
                        <DashboardHome
                            userName={welcomeName}
                            onWatchNow={() => setActiveView("classes")}
                            activeView={activeView}
                            setActiveView={setActiveView}
                        />
                    ) : null}
                    {activeView === "classes" ? <ClassesView /> : null}
                    {activeView === "reserve" ? <ReserveSession /> : null}
                    {activeView === "my-reservations" ? <MyReservations /> : null}
                    {activeView === "resources" ? <Resources /> : null}
                    {activeView === "settings" ? (
                        <Settings
                            showCancelSubscription={showCancelButton}
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
                title="Cancel subscription?"
                description="Are you sure? You will lose access to the academy."
                confirmText="Yes, cancel subscription"
            />
        </div>
    )
}

/**
 * Entire dashboard + booking UI: no RSC, no `/api/student-self`, no server Supabase for this tree.
 */
export default function DashboardPageClient() {
    const router = useRouter()
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
                aria-label="Loading dashboard"
            />
        )
    }

    return (
        <SessionProvider
            initialSessions={[]}
            initialBookingAccess={{
                canBook: false,
                message: null,
                actor: { email: userEmail },
            }}
            initialUserEmail={userEmail}
            initialMyBookings={[]}
        >
            <DashboardShell welcomeName={welcomeName} user={user} />
        </SessionProvider>
    )
}
