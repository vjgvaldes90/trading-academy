"use client"

import type { AdminNotification } from "@/lib/adminNotifications"
import { useLanguage } from "@/context/LanguageProvider"
import { Bell } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

type NotificationsPayload = {
    notifications?: AdminNotification[]
    unreadCount?: number
    error?: string
}

function formatWhen(iso: string, locale: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

export default function AdminNotificationsBell() {
    const { t, language } = useLanguage()
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<AdminNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [markingId, setMarkingId] = useState<string | null>(null)
    const rootRef = useRef<HTMLDivElement | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/notifications", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as NotificationsPayload
            if (!res.ok) {
                throw new Error(
                    typeof payload.error === "string" ? payload.error : t.adminFailedToLoadNotifications
                )
            }
            setItems(Array.isArray(payload.notifications) ? payload.notifications : [])
            setUnreadCount(typeof payload.unreadCount === "number" ? payload.unreadCount : 0)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminFailedToLoadNotifications)
            setItems([])
            setUnreadCount(0)
        } finally {
            setLoading(false)
        }
    }, [t.adminFailedToLoadNotifications])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        if (!open) return
        const onPointerDown = (event: MouseEvent) => {
            const el = rootRef.current
            if (el && !el.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false)
        }
        document.addEventListener("mousedown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("mousedown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [open])

    const markAsRead = async (id: string) => {
        if (markingId) return
        setMarkingId(id)
        try {
            const res = await fetch("/api/admin/notifications", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })
            if (!res.ok) {
                const payload = (await res.json().catch(() => ({}))) as { error?: string }
                throw new Error(
                    typeof payload.error === "string" ? payload.error : t.adminMarkAsReadFailed
                )
            }
            setItems((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            )
            setUnreadCount((c) => Math.max(0, c - 1))
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminMarkAsReadFailed)
        } finally {
            setMarkingId(null)
        }
    }

    const dateLocale = language === "es" ? "es" : "en"
    const badgeLabel =
        unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={t.adminNotificationsAria}
                aria-expanded={open}
                aria-haspopup="dialog"
                className={[
                    "relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10",
                    "bg-white/5 text-slate-200 transition hover:border-blue-500/30 hover:bg-white/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                ].join(" ")}
            >
                <Bell className="h-5 w-5" aria-hidden />
                {badgeLabel ? (
                    <span
                        className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold leading-none text-white"
                        aria-label={t.unreadCountAria.replace("{count}", String(unreadCount))}
                    >
                        {badgeLabel}
                    </span>
                ) : null}
            </button>

            {open ? (
                <div
                    role="dialog"
                    aria-label={t.adminNotificationsTitle}
                    className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/40"
                >
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <h2 className="text-sm font-semibold text-slate-100">
                            {t.adminNotificationsTitle}
                        </h2>
                        {unreadCount > 0 ? (
                            <span className="text-xs tabular-nums text-slate-400">
                                {t.unreadCountAria.replace("{count}", String(unreadCount))}
                            </span>
                        ) : null}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <p className="px-4 py-6 text-sm text-slate-400">{t.loading}</p>
                        ) : error ? (
                            <p className="px-4 py-6 text-sm text-red-400">{error}</p>
                        ) : items.length === 0 ? (
                            <p className="px-4 py-6 text-sm text-slate-400">
                                {t.adminNoNotifications}
                            </p>
                        ) : (
                            <ul className="divide-y divide-white/5">
                                {items.map((n) => {
                                    const unread = !n.is_read
                                    return (
                                        <li
                                            key={n.id}
                                            className={[
                                                "px-4 py-3",
                                                unread ? "bg-blue-500/5" : "",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className={[
                                                            "text-sm font-medium",
                                                            unread ? "text-slate-50" : "text-slate-300",
                                                        ].join(" ")}
                                                    >
                                                        {n.title}
                                                    </p>
                                                    {n.description ? (
                                                        <p className="mt-0.5 truncate text-xs text-slate-400">
                                                            {n.description}
                                                        </p>
                                                    ) : null}
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        {formatWhen(n.created_at, dateLocale)}
                                                    </p>
                                                </div>
                                                {unread ? (
                                                    <button
                                                        type="button"
                                                        disabled={markingId === n.id}
                                                        onClick={() => void markAsRead(n.id)}
                                                        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-blue-300 transition hover:bg-blue-500/10 disabled:opacity-50"
                                                    >
                                                        {t.adminMarkAsRead}
                                                    </button>
                                                ) : (
                                                    <span className="shrink-0 text-[11px] text-slate-500">
                                                        {t.read}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
