"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"
import NextSessionCard from "@/components/dashboard/focused/NextSessionCard"
import ResourcesSection from "@/components/dashboard/focused/ResourcesSection"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import { LearningAssistProvider } from "@/context/LearningAssistContext"
import { persistStudent, STUDENT_STORAGE_KEY, type StoredStudent } from "@/lib/studentLocalStorage"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

function normalizeClasses(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
}

export default function DashboardClient() {
    const router = useRouter()
    const [sessionReady, setSessionReady] = useState(false)
    const [student, setStudent] = useState<StoredStudent | null>(null)

    useEffect(() => {
        let cancelled = false
        const redirectLogin = () => {
            if (!cancelled) router.replace("/login?redirect=/dashboard")
        }

        async function resolveSession() {
            let resolved: StoredStudent | null = null

            const raw = localStorage.getItem(STUDENT_STORAGE_KEY)
            if (raw) {
                try {
                    const parsed: unknown = JSON.parse(raw)
                    if (parsed && typeof parsed === "object") {
                        const o = parsed as Record<string, unknown>
                        const name = typeof o.name === "string" ? o.name.trim() : ""
                        const email = typeof o.email === "string" ? o.email.trim() : ""
                        if (name && email) {
                            resolved = {
                                name,
                                email,
                                classes: normalizeClasses(o.classes),
                            }
                        }
                    }
                } catch {
                    redirectLogin()
                    return
                }
            }

            if (!resolved) {
                try {
                    const res = await fetch("/api/student-self")
                    if (!res.ok) {
                        redirectLogin()
                        return
                    }
                    const j = (await res.json()) as {
                        name?: string
                        email?: string
                        classes?: unknown
                    }
                    const name = typeof j.name === "string" ? j.name.trim() : ""
                    const email = typeof j.email === "string" ? j.email.trim() : ""
                    if (!name || !email) {
                        redirectLogin()
                        return
                    }
                    resolved = {
                        name,
                        email,
                        classes: normalizeClasses(j.classes),
                    }
                    persistStudent(resolved)
                } catch {
                    redirectLogin()
                    return
                }
            }

            if (!resolved) {
                redirectLogin()
                return
            }

            if (!cancelled) {
                setStudent(resolved)
                setSessionReady(true)
            }
        }

        void resolveSession()
        return () => {
            cancelled = true
        }
    }, [router])

    if (!sessionReady || !student) {
        return (
            <div
                className={`${dashboardTheme.shell} ${dashboardTheme.loadingFlex}`}
                aria-busy="true"
                aria-label="Loading dashboard"
            />
        )
    }

    return (
        <LearningAssistProvider>
            <div className={`${dashboardTheme.shell} ${dashboardTheme.layoutColumn}`}>
                <header style={{ flexShrink: 0 }}>
                    <DashboardHeader welcomeName={student.name} />
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
                        <NextSessionCard />
                        <BookSessionSection />
                        <ResourcesSection />
                    </div>
                </main>
            </div>
        </LearningAssistProvider>
    )
}
