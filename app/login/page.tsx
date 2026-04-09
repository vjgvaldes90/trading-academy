"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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

    useEffect(() => {
        if (!magicToken) return
        console.log("[login] token in URL → bypass OTP and use magic login")
        window.location.replace(`/magic-login?token=${encodeURIComponent(magicToken)}`)
    }, [magicToken])

    useEffect(() => {
        console.log("[login] redirect query param", {
            redirect: rawRedirect,
            resolvedTarget: afterLoginTarget,
        })
    }, [rawRedirect, afterLoginTarget])

    const handleCheckout = async () => {
        try {
            const res = await fetch("/api/create-checkout", {
                method: "POST",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            })

            if (!res.ok) {
                throw new Error("Error creando checkout")
            }

            const data = await res.json()

            if (data?.url) {
                window.location.href = data.url
            } else {
                console.error("No URL returned")
            }
        } catch (err) {
            console.error("Checkout error:", err)
            alert("Error al iniciar el pago")
        }
    }

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
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: trimmed }),
            })

            if (!res.ok) {
                setAccessError("Código inválido")
                return
            }

            const data = await res.json()

            if (data.success) {
                const serverRedirect =
                    typeof data.redirect === "string" ? data.redirect : null
                const dest = sanitizeRedirect(serverRedirect ?? afterLoginTarget, afterLoginTarget)
                console.log("[login] access code OK", {
                    profileCompleted: data.profileCompleted === true,
                    redirect: dest,
                })
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
                console.log("[login] invalid code", { hasPaid: false })
                setAccessError("Código inválido")
            }
        } catch (err) {
            console.error("Access error:", err)
            setAccessError("Código inválido")
        }
    }

    return (
        <div className="min-h-screen grid md:grid-cols-2">
            <LoginInfo />

            <div className="flex items-center justify-center bg-white p-8">
                <LoginCard
                    mode={mode}
                    setMode={setMode}
                    email={email}
                    setEmail={setEmail}
                    code={code}
                    setCode={setCode}
                    handleCheckout={handleCheckout}
                    handleAccess={handleAccess}
                    accessError={accessError}
                    onClearAccessError={() => setAccessError(null)}
                    startOnAccessTab={fromEmailCta}
                />
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
                    Cargando…
                </div>
            }
        >
            <LoginPageInner />
        </Suspense>
    )
}
