"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import LoginInfo from "@/components/login/LoginInfo"
import LoginCard from "@/components/login/LoginCard"
import { sanitizeRedirect } from "@/lib/sanitizeRedirect"
import { persistStudent } from "@/lib/studentLocalStorage"

function LoginPageInner() {
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [mode, setMode] = useState<"buy" | "access">("buy")
    const [accessError, setAccessError] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const rawRedirect = searchParams.get("redirect")
    const magicToken = searchParams.get("token")?.trim() ?? ""

    const afterLoginTarget =
        rawRedirect != null && rawRedirect !== ""
            ? sanitizeRedirect(rawRedirect, "/dashboard")
            : "/dashboard"

    const fromEmailCta = searchParams.has("redirect")
    const queryError = searchParams.get("error")?.trim()
    const queryAccessError =
        queryError === "access_denied"
            ? "Tu acceso a la academia no está activo o ha caducado. Si crees que es un error, contacta al administrador."
            : queryError === "session_expired"
              ? "Tu sesión ha finalizado porque iniciaste sesión en otro dispositivo. Vuelve a entrar con tu código o enlace."
              : null

    useEffect(() => {
        if (!magicToken) return
        window.location.replace(`/magic-login?token=${encodeURIComponent(magicToken)}`)
    }, [magicToken])

    const handleAccess = async () => {
        setAccessError(null)
        const trimmed = code.trim()
        if (!trimmed) {
            setAccessError("Código inválido")
            return
        }

        try {
            const res = await fetch("/api/validate-code", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: trimmed }),
            })

            if (!res.ok) {
                setAccessError("Código inválido")
                return
            }

            const data = (await res.json()) as {
                success?: unknown
                error?: string
                reason?: string
                message?: string
                redirect?: string
                profileCompleted?: boolean
                student?: unknown
            }

            if (data.success === false && data.error === "ACCESS_DENIED") {
                if (data.reason === "expired") {
                    window.location.replace("/expired")
                    return
                }
                if (data.reason === "inactive") {
                    window.location.replace("/blocked")
                    return
                }
                if (typeof data.message === "string") {
                    setAccessError(data.message)
                    return
                }
            }

            if (data.success) {
                const serverRedirect =
                    typeof data.redirect === "string" ? data.redirect : null
                const dest = sanitizeRedirect(serverRedirect ?? afterLoginTarget, afterLoginTarget)
                const st = data.student as
                    | { name?: string; email?: string; classes?: unknown }
                    | undefined
                if (
                    dest !== "/complete-profile" &&
                    st?.name &&
                    typeof st.name === "string" &&
                    typeof st.email === "string" &&
                    st.email.trim()
                ) {
                    const cls = Array.isArray(st.classes)
                        ? st.classes.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
                        : []
                    persistStudent({
                        name: st.name.trim(),
                        email: st.email.trim().toLowerCase(),
                        classes: cls,
                    })
                }
                window.location.assign(dest)
            } else {
                setAccessError("Código inválido")
            }
        } catch (err) {
            console.error("Access error:", err)
            setAccessError("Código inválido")
        }
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white md:grid md:grid-cols-2">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.35),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(239,68,68,0.2),transparent_45%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
            <LoginInfo />

            <div className="relative flex items-center justify-center p-8">
                <LoginCard
                    mode={mode}
                    setMode={setMode}
                    email={email}
                    setEmail={setEmail}
                    code={code}
                    setCode={setCode}
                    handleAccess={handleAccess}
                    accessError={accessError ?? queryAccessError}
                    onClearAccessError={() => setAccessError(null)}
                    startOnAccessTab={fromEmailCta}
                />
            </div>
            <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center px-6">
                <Link href="/disclaimer" className="text-xs font-semibold text-slate-400 transition hover:text-blue-300">
                    Disclaimer Legal
                </Link>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-300">
                    Cargando���
                </div>
            }
        >
            <LoginPageInner />
        </Suspense>
    )
}
