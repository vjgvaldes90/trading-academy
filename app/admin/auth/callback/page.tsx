"use client"

import { supabase } from "@/lib/supabase"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

function AdminAuthCallbackInner() {
    const searchParams = useSearchParams()
    const [message, setMessage] = useState("Confirming admin access...")

    useEffect(() => {
        let cancelled = false

        const run = async () => {
            try {
                const code = searchParams.get("code")
                if (code) {
                    const { error: exErr } = await supabase.auth.exchangeCodeForSession(
                        typeof window !== "undefined" ? window.location.href : ""
                    )
                    if (exErr) {
                        if (!cancelled) setMessage("Invalid or expired link. Request a new admin login email.")
                        return
                    }
                }

                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session?.access_token) {
                    if (!cancelled) setMessage("Could not create admin session. Request a new login email.")
                    return
                }

                const res = await fetch("/api/admin/auth/establish-from-supabase", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ access_token: session.access_token }),
                })
                const payload = (await res.json().catch(() => ({}))) as {
                    ok?: unknown
                    redirect?: string
                }
                if (!res.ok || payload.ok !== true) {
                    await supabase.auth.signOut()
                    window.location.replace("/admin-login?error=unauthorized")
                    return
                }

                await supabase.auth.signOut()
                window.location.replace(
                    typeof payload.redirect === "string" && payload.redirect.startsWith("/")
                        ? payload.redirect
                        : "/admin"
                )
            } catch (e) {
                console.error("[admin/auth/callback]", e)
                if (!cancelled) setMessage("Unexpected error. Please try again.")
            }
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4">
            <p className="text-slate-300 text-center max-w-md" role="status">
                {message}
            </p>
        </div>
    )
}

export default function AdminAuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-300">
                    Loading...
                </div>
            }
        >
            <AdminAuthCallbackInner />
        </Suspense>
    )
}
