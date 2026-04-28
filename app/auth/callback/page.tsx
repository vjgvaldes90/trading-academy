"use client"

import { supabase } from "@/lib/supabase"
import { buildStudentDisplayName, persistStudent } from "@/lib/studentLocalStorage"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

function AuthCallbackInner() {
    const searchParams = useSearchParams()
    const [message, setMessage] = useState("Confirmando acceso…")

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
                        console.error("[auth/callback] exchangeCodeForSession", exErr)
                        if (!cancelled) {
                            setMessage("Enlace inválido o caducado. Solicita un nuevo acceso desde el login.")
                        }
                        return
                    }
                }

                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session?.access_token) {
                    if (!cancelled) {
                        setMessage("No se pudo iniciar sesión. Abre el enlace desde el correo o vuelve a solicitar acceso.")
                    }
                    return
                }

                const res = await fetch("/api/auth/establish-from-supabase", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ access_token: session.access_token }),
                })

                const payload = (await res.json().catch(() => ({}))) as {
                    ok?: unknown
                    redirect?: string
                    reason?: string
                }

                if (!res.ok || payload.ok !== true) {
                    const dest =
                        typeof payload.redirect === "string" && payload.redirect.startsWith("/")
                            ? payload.redirect
                            : null
                    if (dest) {
                        await supabase.auth.signOut()
                        window.location.replace(dest)
                        return
                    }
                    if (!cancelled) {
                        setMessage("No pudimos completar el acceso. Intenta de nuevo o contacta soporte.")
                    }
                    return
                }

                const redirect =
                    typeof payload.redirect === "string" && payload.redirect.startsWith("/")
                        ? payload.redirect
                        : "/dashboard"

                const email = session.user.email?.trim().toLowerCase() ?? ""
                if (email) {
                    persistStudent({
                        name: buildStudentDisplayName({ email }),
                        email,
                        classes: [],
                    })
                }

                await supabase.auth.signOut()

                if (!cancelled) {
                    window.location.replace(redirect)
                }
            } catch (e) {
                console.error("[auth/callback]", e)
                if (!cancelled) {
                    setMessage("Error inesperado. Vuelve al login e inténtalo de nuevo.")
                }
            }
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <p className="text-gray-700 text-center max-w-md" role="status">
                {message}
            </p>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
                    Cargando…
                </div>
            }
        >
            <AuthCallbackInner />
        </Suspense>
    )
}
