"use client"

import type { AdminNotification } from "@/lib/adminNotifications"
import { useLanguage } from "@/context/LanguageProvider"
import { ArrowLeft, UserPlus } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

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

function resolveStudentLabel(
    notification: AdminNotification,
    fallback: string
): string {
    const meta = notification.metadata
    const nameRaw = meta.name
    const emailRaw = meta.email
    const name = typeof nameRaw === "string" ? nameRaw.trim() : ""
    const email = typeof emailRaw === "string" ? emailRaw.trim() : ""
    if (name) return name
    if (email) return email

    const description = notification.description.trim()
    if (description) {
        const paren = description.match(/^(.+?)\s*\(([^)]+@[^)]+)\)\s*$/)
        if (paren?.[1]?.trim()) return paren[1].trim()
        if (description.includes("@")) return description
    }

    return fallback
}

export default function AdminAppEnrollmentsClient() {
    const { t, language } = useLanguage()
    const [items, setItems] = useState<AdminNotification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [markingId, setMarkingId] = useState<string | null>(null)

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
                    typeof payload.error === "string"
                        ? payload.error
                        : t.adminAppEnrollmentsLoadError
                )
            }
            const list = Array.isArray(payload.notifications) ? payload.notifications : []
            const enrollments = list
                .filter((n) => n.type === "new_student")
                .sort((a, b) => {
                    const ta = Date.parse(a.created_at)
                    const tb = Date.parse(b.created_at)
                    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
                    if (Number.isNaN(ta)) return 1
                    if (Number.isNaN(tb)) return -1
                    return tb - ta
                })
            setItems(enrollments)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminAppEnrollmentsLoadError)
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [t.adminAppEnrollmentsLoadError])

    useEffect(() => {
        void load()
    }, [load])

    const markAsRead = async (id: string) => {
        if (markingId) return
        setMarkingId(id)
        setError(null)
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
                    typeof payload.error === "string"
                        ? payload.error
                        : t.adminMarkAsReadFailed
                )
            }
            setItems((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminMarkAsReadFailed)
        } finally {
            setMarkingId(null)
        }
    }

    const dateLocale = language === "es" ? "es" : "en"

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.12),transparent_36%)]"
            />

            <header className="relative z-10 mb-5 pr-[5.5rem]">
                <Link
                    href="/admin-app"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppEnrollmentsBack}
                </Link>

                <div className="mt-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
                        <UserPlus className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {t.adminAppEnrollmentsTitle}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            {t.adminAppEnrollmentsSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            <section className="relative z-10 flex-1">
                {loading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminAppEnrollmentsLoading}
                    </p>
                ) : error && items.length === 0 ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                        <p className="text-sm text-red-200">{error}</p>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                        >
                            {t.adminAppEnrollmentsRetry}
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminAppEnrollmentsEmpty}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {error ? (
                            <li className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                {error}
                            </li>
                        ) : null}
                        {items.map((n) => {
                            const unread = !n.is_read
                            const label = resolveStudentLabel(
                                n,
                                t.adminAppEnrollmentsUnknownStudent
                            )
                            const when = formatWhen(n.created_at, dateLocale)
                            return (
                                <li
                                    key={n.id}
                                    className={[
                                        "rounded-2xl border bg-[#111827]/95 p-4",
                                        unread
                                            ? "border-amber-400/30"
                                            : "border-white/[0.08]",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-white">
                                                {label}
                                            </p>
                                            {when ? (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {when}
                                                </p>
                                            ) : null}
                                        </div>
                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                unread
                                                    ? "bg-amber-500/20 text-amber-200"
                                                    : "bg-white/[0.06] text-slate-500",
                                            ].join(" ")}
                                        >
                                            {unread
                                                ? t.adminAppEnrollmentsUnread
                                                : t.adminAppEnrollmentsRead}
                                        </span>
                                    </div>
                                    {unread ? (
                                        <button
                                            type="button"
                                            disabled={markingId === n.id}
                                            onClick={() => void markAsRead(n.id)}
                                            className="mt-3 inline-flex items-center rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition active:bg-blue-500/20 disabled:opacity-50"
                                        >
                                            {t.adminAppEnrollmentsMarkAsRead}
                                        </button>
                                    ) : null}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </div>
    )
}
