"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageProvider"

type SyncState = "loading" | "success" | "error"

function SuccessPageContent() {
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get("session_id")?.trim() ?? ""
    const isMissingSessionId = sessionId.length === 0

    const [syncState, setSyncState] = useState<SyncState>(isMissingSessionId ? "error" : "loading")
    const [errorMessage, setErrorMessage] = useState(
        isMissingSessionId ? t.successMissingSession : ""
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
                        : t.successSessionError
                setErrorMessage(msg)
                setSyncState("error")
                return
            }

            if (typeof data.email !== "string" || !data.email.trim()) {
                setErrorMessage(t.successNoEmail)
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
            setErrorMessage(t.successSessionError)
            setSyncState("error")
        }
    }, [sessionId, t])

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
                        ? t.successTitleError
                        : t.successTitle}
                </h1>

                {syncState === "loading" || syncState === "success" ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>
                        {t.successPreparing}
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
                                {t.successRetry}
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

function SuccessPageFallback() {
    const { t } = useLanguage()
    return (
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
            {t.successPreparing}
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<SuccessPageFallback />}>
            <SuccessPageContent />
        </Suspense>
    )
}
