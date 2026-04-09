"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"
import MyBookingsSection from "@/components/dashboard/focused/MyBookingsSection"
import NextSessionCard from "@/components/dashboard/focused/NextSessionCard"
import ResourcesSection from "@/components/dashboard/focused/ResourcesSection"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import { LearningAssistProvider } from "@/context/LearningAssistContext"
import { SessionProvider, useSession } from "@/context/SessionContext"
import { persistStudent, readStoredStudent, resolveDashboardStudent } from "@/lib/studentLocalStorage"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

function DashboardShell({ welcomeName }: { welcomeName: string }) {
    const { dashboardDataReady } = useSession()

    if (!dashboardDataReady) {
        return (
            <div
                className={`${dashboardTheme.shell} ${dashboardTheme.loadingFlex}`}
                aria-busy="true"
                aria-label="Cargando calendario"
            />
        )
    }

    return (
        <div className={`${dashboardTheme.shell} ${dashboardTheme.layoutColumn}`}>
            <header style={{ flexShrink: 0 }}>
                <DashboardHeader welcomeName={welcomeName} />
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
                    <MyBookingsSection />
                    <NextSessionCard />
                    <BookSessionSection />
                    <ResourcesSection />
                </div>
            </main>
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

    useEffect(() => {
        const student = resolveDashboardStudent()
        if (!student) {
            router.replace("/login?redirect=/dashboard")
            return
        }
        if (!readStoredStudent()) {
            persistStudent(student)
        }
        setWelcomeName(student.name)
        setUserEmail(student.email.trim().toLowerCase())
        setReady(true)
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
                actor: { userId: null, email: userEmail },
            }}
            initialUserEmail={userEmail}
            initialMyBookings={[]}
        >
            <LearningAssistProvider>
                <DashboardShell welcomeName={welcomeName} />
            </LearningAssistProvider>
        </SessionProvider>
    )
}
