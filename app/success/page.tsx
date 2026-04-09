"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

const REDIRECT_MS = 2800

function SuccessPageContent() {
    const searchParams = useSearchParams()
    const [isError, setIsError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const didRedirect = useRef(false)

    useEffect(() => {
        const sessionId = searchParams.get("session_id")

        if (!sessionId) {
            setIsError(true)
            setErrorMessage("No se encontró la sesión de pago. Vuelve a intentar o contacta soporte.")
            return
        }

        void (async () => {
            try {
                const res = await fetch("/api/get-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: sessionId }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    console.warn("[success] get-session warning", data?.error ?? res.status)
                } else {
                    console.log("[success] access synced", { email: data?.email })
                }
            } catch (e) {
                console.warn("[success] get-session failed (non-blocking)", e)
            }
        })()

        const timer = window.setTimeout(() => {
            if (didRedirect.current) return
            didRedirect.current = true
            console.log("[success] redirecting to /complete-profile?from=payment after payment")
            window.location.href = "/complete-profile?from=payment"
        }, REDIRECT_MS)

        return () => window.clearTimeout(timer)
    }, [searchParams])

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#0f172a",
                color: "white",
                textAlign: "center",
                padding: "24px",
            }}
        >
            <div
                style={{
                    background: "#1e293b",
                    padding: "44px 36px",
                    borderRadius: "16px",
                    maxWidth: "28rem",
                    width: "100%",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                }}
            >
                {!isError && (
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            border: "3px solid #334155",
                            borderTop: "3px solid #22c55e",
                            borderRadius: "50%",
                            margin: "0 auto 1.25rem",
                            animation: "spin 0.9s linear infinite",
                        }}
                    />
                )}
                <h1
                    style={{
                        margin: "0 0 12px 0",
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        lineHeight: 1.35,
                    }}
                >
                    {isError ? "Algo salió mal" : "✅ Payment successful. Preparing your access..."}
                </h1>
                {!isError && (
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>
                        Te llevamos a completar tu perfil en unos segundos.
                    </p>
                )}
                {isError && errorMessage && (
                    <p style={{ color: "#cbd5e1", lineHeight: 1.6, fontSize: "0.9rem", margin: "16px 0 0 0" }}>
                        {errorMessage}
                    </p>
                )}
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
            </div>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense
            fallback={
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "#0f172a",
                        color: "white",
                    }}
                >
                    Cargando…
                </div>
            }
        >
            <SuccessPageContent />
        </Suspense>
    )
}
