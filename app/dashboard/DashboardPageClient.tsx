"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"
import MyBookingsSection from "@/components/dashboard/focused/MyBookingsSection"
import StudentNotificationsSection from "@/components/dashboard/focused/StudentNotificationsSection"
import NextSessionCard from "@/components/dashboard/focused/NextSessionCard"
import ResourcesSection from "@/components/dashboard/focused/ResourcesSection"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
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
    const { dashboardDataReady } = useSession()
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
        <div className={`${dashboardTheme.shell} ${dashboardTheme.layoutColumn}`}>
            <header style={{ flexShrink: 0 }}>
                <DashboardHeader
                    welcomeName={welcomeName}
                    showCancelSubscription={showCancelButton}
                    onCancelSubscription={() => setCancelModalOpen(true)}
                    isCancellingSubscription={isCancelling}
                />
            </header>

            <main
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                <div
                    className={dashboardTheme.contentMax}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--ds-5)",
                        paddingTop: "var(--ds-4)",
                        paddingBottom: "var(--ds-5)",
                    }}
                >
                    <StudentNotificationsSection />
                    <MyBookingsSection />
                    <NextSessionCard />
                    <BookSessionSection />
                    <ResourcesSection />
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
