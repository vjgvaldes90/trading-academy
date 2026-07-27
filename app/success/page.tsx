"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

type SyncState = "loading" | "success" | "error"

function SuccessPageContent() {
    const searchParams = useSearchParams()
    const sessionId = searchParams.get("session_id")?.trim() ?? ""
    const isMissingSessionId = sessionId.length === 0

    const [syncState, setSyncState] = useState<SyncState>(isMissingSessionId ? "error" : "loading")
    const [errorMessage, setErrorMessage] = useState(
        isMissingSessionId
            ? "No se encontró la sesión de pago. Vuelve a intentar o contacta soporte."
            : ""
    )
    const redirectedRef = useRef(false)

    const prepareSession = useCallback(async () => {
        if (!sessionId || redirectedRef.current) return

        setSyncState("loading")
        setErrorMessage("")

        try {
            const res = await fetch("/api/get-session", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId }),
            })
            const data = (await res.json().catch(() => ({}))) as {
                ok?: unknown
                email?: unknown
                session_ready?: unknown
                error?: unknown
            }

            if (!res.ok || data.ok !== true || data.session_ready !== true) {
                const msg =
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : "Hubo un problema preparando tu sesión. Intenta de nuevo."
                setErrorMessage(msg)
                setSyncState("error")
                return
            }

            if (typeof data.email !== "string" || !data.email.trim()) {
                setErrorMessage("La sesión se creó sin email. Intenta de nuevo o contacta soporte.")
                setSyncState("error")
                return
            }

            setSyncState("success")
            redirectedRef.current = true
            console.log("[success] session ready, redirecting to /complete-profile", {
                email: data.email,
            })
            window.location.assign("/complete-profile?from=payment")
        } catch (e) {
            console.warn("[success] get-session failed", e)
            setErrorMessage("Hubo un problema preparando tu sesión. Intenta de nuevo.")
            setSyncState("error")
        }
    }, [sessionId])

    useEffect(() => {
        if (isMissingSessionId) return
        void prepareSession()
    }, [isMissingSessionId, prepareSession])

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
                {syncState === "loading" || syncState === "success" ? (
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
                ) : null}

                <h1
                    style={{
                        margin: "0 0 12px 0",
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        lineHeight: 1.35,
                    }}
                >
                    {syncState === "error"
                        ? "No pudimos preparar tu acceso"
                        : "✅ Payment successful"}
                </h1>

                {syncState === "loading" || syncState === "success" ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>
                        Preparando tu cuenta…
                    </p>
                ) : null}

                {syncState === "error" ? (
                    <>
                        <p
                            style={{
                                color: "#cbd5e1",
                                lineHeight: 1.6,
                                fontSize: "0.9rem",
                                margin: "0 0 20px 0",
                            }}
                        >
                            {errorMessage}
                        </p>
                        {!isMissingSessionId ? (
                            <button
                                type="button"
                                onClick={() => {
                                    redirectedRef.current = false
                                    void prepareSession()
                                }}
                                style={{
                                    padding: "12px 20px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(59,130,246,0.45)",
                                    background: "#2563eb",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "0.875rem",
                                    cursor: "pointer",
                                }}
                            >
                                Reintentar
                            </button>
                        ) : null}
                    </>
                ) : null}

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
                    Preparando tu cuenta…
                </div>
            }
        >
            <SuccessPageContent />
        </Suspense>
    )
}
