"use client"

import {
    formatPrivateClassPriceCents,
    formatPrivateClassTime,
    privateClassStatusBadgeClass,
    privateClassStatusLabel,
} from "@/components/dashboard/privateClassLabels"
import { useLanguage } from "@/context/LanguageProvider"
import {
    adminPrivateClassRequest,
    isPrivateClassStatus,
    type PrivateClassStatus,
} from "@/lib/privateClassRequests"
import { ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type AdminPrivateClassRequest = ReturnType<typeof adminPrivateClassRequest>

type StatusFilter = "all" | PrivateClassStatus

type ListPayload = {
    requests?: AdminPrivateClassRequest[]
    error?: string
}

export default function AdminAppPrivateClassesClient() {
    const { t, language } = useLanguage()
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
    const [items, setItems] = useState<AdminPrivateClassRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (statusFilter !== "all") {
                params.set("status", statusFilter)
            }
            const qs = params.toString()
            const res = await fetch(
                `/api/admin/private-class-requests${qs ? `?${qs}` : ""}`,
                {
                    cache: "no-store",
                    credentials: "include",
                }
            )
            const payload = (await res.json().catch(() => ({}))) as ListPayload
            if (!res.ok) {
                throw new Error(
                    typeof payload.error === "string"
                        ? payload.error
                        : t.adminPrivateClassLoadError
                )
            }
            setItems(Array.isArray(payload.requests) ? payload.requests : [])
        } catch (e) {
            setError(e instanceof Error ? e.message : t.adminPrivateClassLoadError)
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [statusFilter, t.adminPrivateClassLoadError])

    useEffect(() => {
        void load()
    }, [load])

    const filters: { id: StatusFilter; label: string }[] = [
        { id: "all", label: t.adminPrivateClassFilterAll },
        { id: "pending", label: t.adminPrivateClassFilterPending },
        { id: "awaiting_payment", label: t.adminPrivateClassFilterAwaitingPayment },
        { id: "paid", label: t.adminPrivateClassFilterPaid },
        { id: "confirmed", label: t.adminPrivateClassFilterConfirmed },
        { id: "completed", label: t.adminPrivateClassFilterCompleted },
        { id: "rejected", label: t.adminPrivateClassFilterRejected },
        { id: "cancelled", label: t.adminPrivateClassFilterCancelled },
    ]

    const dateLocale = language === "es" ? "es-ES" : "en-US"

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.1),transparent_36%)]"
            />

            <header className="relative z-10 mb-5 pr-[5.5rem]">
                <Link
                    href="/admin-app"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppPrivateClassesBackHome}
                </Link>

                <div className="mt-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-blue-300">
                        <BookOpen className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {t.adminPrivateClassRequests}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            {t.adminPrivateClassSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            <div className="relative z-10 -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {filters.map((f) => {
                    const active = statusFilter === f.id
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setStatusFilter(f.id)}
                            className={[
                                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                active
                                    ? "border-blue-400/40 bg-blue-600/25 text-blue-100"
                                    : "border-white/10 bg-white/[0.03] text-slate-400 active:bg-white/[0.06]",
                            ].join(" ")}
                        >
                            {f.label}
                        </button>
                    )
                })}
            </div>

            <section className="relative z-10 flex-1">
                {loading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminPrivateClassLoading}
                    </p>
                ) : error && items.length === 0 ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                        <p className="text-sm text-red-200">{error}</p>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                        >
                            {t.adminPrivateClassRetry}
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminPrivateClassEmpty}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {error ? (
                            <li className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                {error}
                            </li>
                        ) : null}
                        {items.map((row) => {
                            const status = isPrivateClassStatus(row.status)
                                ? row.status
                                : String(row.status)
                            return (
                                <li key={row.id}>
                                    <Link
                                        href={`/admin-app/private-classes/${encodeURIComponent(row.id)}`}
                                        className="block rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4 transition active:bg-white/[0.04]"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                                                {row.student_email}
                                            </p>
                                            <span
                                                className={[
                                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    privateClassStatusBadgeClass(status),
                                                ].join(" ")}
                                            >
                                                {privateClassStatusLabel(status, t, {
                                                    forAdmin: true,
                                                })}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">
                                            {row.requested_date} ·{" "}
                                            {formatPrivateClassTime(row.requested_time)} ·{" "}
                                            {row.duration_minutes} min
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {formatPrivateClassPriceCents(row.price_cents)}
                                            {row.created_at
                                                ? ` · ${new Date(row.created_at).toLocaleString(dateLocale, {
                                                      dateStyle: "medium",
                                                      timeStyle: "short",
                                                  })}`
                                                : ""}
                                        </p>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </div>
    )
}
