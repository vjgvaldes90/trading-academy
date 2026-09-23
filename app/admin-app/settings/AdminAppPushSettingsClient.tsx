"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { ArrowLeft, Bell, BellOff, BellRing, Smartphone } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

const SW_URL = "/admin-app/sw.js"
const SW_SCOPE = "/admin-app/"

type UiStatus =
    | "loading"
    | "unsupported"
    | "server_unconfigured"
    | "needs_homescreen"
    | "permission_denied"
    | "not_subscribed"
    | "subscribed"
    | "error"

function isIosDevice(): boolean {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(ua)
    const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
    return iOS || iPadOs
}

function isStandaloneDisplay(): boolean {
    if (typeof window === "undefined") return false
    const mq = window.matchMedia("(display-mode: standalone)").matches
    const iosStandalone =
        "standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    return mq || iosStandalone
}

function pushApiSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const output = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i += 1) {
        output[i] = rawData.charCodeAt(i)
    }
    return output
}

async function fetchVapidPublicKey(): Promise<string | null> {
    const res = await fetch("/api/admin/push/vapid-public-key", {
        credentials: "include",
        cache: "no-store",
    })
    if (res.status === 503) return null
    if (!res.ok) throw new Error("vapid_fetch_failed")
    const data = (await res.json()) as { publicKey?: string }
    return typeof data.publicKey === "string" && data.publicKey ? data.publicKey : null
}

async function checkServerSubscribed(endpoint: string): Promise<boolean> {
    const url = `/api/admin/push/subscription?endpoint=${encodeURIComponent(endpoint)}`
    const res = await fetch(url, { credentials: "include", cache: "no-store" })
    if (!res.ok) return false
    const data = (await res.json()) as { subscribed?: boolean; configured?: boolean }
    if (data.configured === false) return false
    return data.subscribed === true
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE)
    if (existing) return existing
    return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
}

export default function AdminAppPushSettingsClient() {
    const { t } = useLanguage()
    const [status, setStatus] = useState<UiStatus>("loading")
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const refreshStatus = useCallback(async () => {
        setMessage(null)

        if (!pushApiSupported()) {
            setStatus("unsupported")
            return
        }

        if (isIosDevice() && !isStandaloneDisplay()) {
            setStatus("needs_homescreen")
            return
        }

        try {
            const publicKey = await fetchVapidPublicKey()
            if (!publicKey) {
                setStatus("server_unconfigured")
                return
            }

            if (Notification.permission === "denied") {
                setStatus("permission_denied")
                return
            }

            const registration = await ensureServiceWorker()
            await navigator.serviceWorker.ready
            const sub = await registration.pushManager.getSubscription()

            if (!sub) {
                setStatus("not_subscribed")
                return
            }

            const onServer = await checkServerSubscribed(sub.endpoint)
            setStatus(onServer ? "subscribed" : "not_subscribed")
        } catch {
            setStatus("error")
            setMessage(t.adminAppPushStatusError)
        }
    }, [t.adminAppPushStatusError])

    useEffect(() => {
        void refreshStatus()
    }, [refreshStatus])

    const enableNotifications = async () => {
        setBusy(true)
        setMessage(null)
        try {
            if (!pushApiSupported()) {
                setStatus("unsupported")
                return
            }
            if (isIosDevice() && !isStandaloneDisplay()) {
                setStatus("needs_homescreen")
                return
            }

            const publicKey = await fetchVapidPublicKey()
            if (!publicKey) {
                setStatus("server_unconfigured")
                return
            }

            const permission = await Notification.requestPermission()
            if (permission !== "granted") {
                setStatus("permission_denied")
                setMessage(t.adminAppPushPermissionDenied)
                return
            }

            const registration = await ensureServiceWorker()
            await navigator.serviceWorker.ready

            let subscription = await registration.pushManager.getSubscription()
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
                })
            }

            const json = subscription.toJSON()
            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error("incomplete_subscription")
            }

            const res = await fetch("/api/admin/push/subscription", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: json.endpoint,
                    expirationTime: json.expirationTime ?? null,
                    keys: {
                        p256dh: json.keys.p256dh,
                        auth: json.keys.auth,
                    },
                }),
            })

            if (!res.ok) {
                setStatus("not_subscribed")
                setMessage(t.adminAppPushSaveFailed)
                return
            }

            setStatus("subscribed")
            setMessage(t.adminAppPushEnabledSuccess)
        } catch {
            setStatus("error")
            setMessage(t.adminAppPushEnableFailed)
        } finally {
            setBusy(false)
        }
    }

    const sendTestNotification = async () => {
        setBusy(true)
        setMessage(null)
        try {
            const res = await fetch("/api/admin/push/test", {
                method: "POST",
                credentials: "include",
            })
            const data = (await res.json().catch(() => ({}))) as {
                ok?: boolean
                error?: string
                note?: string
                accepted?: number
            }

            if (!res.ok || data.ok !== true) {
                setMessage(
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : t.adminAppPushTestFailed
                )
                return
            }

            setMessage(t.adminAppPushTestSuccess)
        } catch {
            setMessage(t.adminAppPushTestFailed)
        } finally {
            setBusy(false)
        }
    }

    const disableNotifications = async () => {
        setBusy(true)
        setMessage(null)
        try {
            const registration = await ensureServiceWorker()
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                const endpoint = subscription.endpoint
                await fetch("/api/admin/push/subscription", {
                    method: "DELETE",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint }),
                })
                try {
                    await subscription.unsubscribe()
                } catch {
                    // server row removal is enough for Phase 1
                }
            }

            setStatus("not_subscribed")
            setMessage(t.adminAppPushDisabledSuccess)
        } catch {
            setStatus("error")
            setMessage(t.adminAppPushDisableFailed)
        } finally {
            setBusy(false)
        }
    }

    const statusLabel = (() => {
        switch (status) {
            case "loading":
                return t.adminAppPushStatusLoading
            case "unsupported":
                return t.adminAppPushStatusUnsupported
            case "server_unconfigured":
                return t.adminAppPushStatusServerUnconfigured
            case "needs_homescreen":
                return t.adminAppPushStatusNeedsHomescreen
            case "permission_denied":
                return t.adminAppPushStatusPermissionDenied
            case "not_subscribed":
                return t.adminAppPushStatusOff
            case "subscribed":
                return t.adminAppPushStatusOn
            case "error":
                return t.adminAppPushStatusError
            default:
                return ""
        }
    })()

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.12),transparent_36%)]"
            />

            <header className="relative z-10 mb-5">
                <Link
                    href="/admin-app"
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition active:text-white"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {t.adminAppPushBackHome}
                </Link>
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-300">
                        <Bell className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-white">{t.adminAppPushTitle}</h1>
                        <p className="mt-0.5 text-xs text-slate-400">{t.adminAppPushSubtitle}</p>
                    </div>
                </div>
            </header>

            <section className="relative z-10 space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        {t.adminAppPushStatusLabel}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{statusLabel}</p>
                    {message ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{message}</p> : null}
                </div>

                {status === "unsupported" ? (
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100/90">
                        {t.adminAppPushUnsupportedHint}
                    </div>
                ) : null}

                {status === "needs_homescreen" ? (
                    <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-blue-200">
                            <Smartphone className="h-4 w-4" aria-hidden />
                            <p className="text-sm font-semibold">{t.adminAppPushIphoneTitle}</p>
                        </div>
                        <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-300">
                            <li>{t.adminAppPushIphoneStep1}</li>
                            <li>{t.adminAppPushIphoneStep2}</li>
                            <li>{t.adminAppPushIphoneStep3}</li>
                            <li>{t.adminAppPushIphoneStep4}</li>
                        </ol>
                    </div>
                ) : null}

                {status === "server_unconfigured" ? (
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100/90">
                        {t.adminAppPushServerUnconfiguredHint}
                    </div>
                ) : null}

                <div className="flex flex-col gap-2">
                    {status === "subscribed" ? (
                        <>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void sendTestNotification()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-100 transition active:bg-blue-500/25 disabled:opacity-50"
                            >
                                <BellRing className="h-4 w-4" aria-hidden />
                                {busy ? t.adminAppPushWorking : t.adminAppPushTestSend}
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void disableNotifications()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition active:bg-white/[0.08] disabled:opacity-50"
                            >
                                <BellOff className="h-4 w-4" aria-hidden />
                                {busy ? t.adminAppPushWorking : t.adminAppPushDisable}
                            </button>
                        </>
                    ) : null}

                    {status === "not_subscribed" ||
                    status === "permission_denied" ||
                    status === "error" ? (
                        <button
                            type="button"
                            disabled={busy || status === "permission_denied"}
                            onClick={() => void enableNotifications()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-100 transition active:bg-amber-500/30 disabled:opacity-50"
                        >
                            <Bell className="h-4 w-4" aria-hidden />
                            {busy ? t.adminAppPushWorking : t.adminAppPushEnable}
                        </button>
                    ) : null}

                    {status !== "loading" && status !== "unsupported" ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void refreshStatus()}
                            className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 transition active:text-white disabled:opacity-50"
                        >
                            {t.adminAppPushRefresh}
                        </button>
                    ) : null}
                </div>

                <p className="text-xs leading-relaxed text-slate-500">{t.adminAppPushPhase2Note}</p>
            </section>
        </div>
    )
}
