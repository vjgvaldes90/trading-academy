"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"
import { ArrowLeft, Search, Users } from "lucide-react"
import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

export type AdminAppStudentRow = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    plan: string | null
    access_type: string | null
    is_active: boolean | null
    access_expires_at: string | null
    subscription_status: string | null
    profile_completed?: boolean | null
    created_at?: string | null
}

type ErrorPayload = {
    error?: string
    details?: string
    success?: boolean
    message?: string
}

const CREATE_ACCESS_TYPES = ["free", "paid", "vip", "discount"] as const

function displayName(row: AdminAppStudentRow): string {
    const first = typeof row.first_name === "string" ? row.first_name.trim() : ""
    const last = typeof row.last_name === "string" ? row.last_name.trim() : ""
    const full = `${first} ${last}`.trim()
    return full || "—"
}

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function matchesSearch(row: AdminAppStudentRow, query: string): boolean {
    const q = normalizeSearch(query)
    if (!q) return true
    const first = typeof row.first_name === "string" ? row.first_name : ""
    const last = typeof row.last_name === "string" ? row.last_name : ""
    const hay = normalizeSearch(`${first} ${last} ${row.email}`)
    return hay.includes(q)
}

function studentPathEmail(email: string): string {
    return encodeURIComponent(email.trim().toLowerCase())
}

export default function AdminAppStudentsClient() {
    const { t } = useLanguage()
    const [rows, setRows] = useState<AdminAppStudentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [createBusy, setCreateBusy] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [accessType, setAccessType] =
        useState<(typeof CREATE_ACCESS_TYPES)[number]>("free")

    const programLabel = useCallback(
        (raw: string | null): string => {
            const plan = resolveSubscriptionPlan(raw)
            if (plan === "full_program") return t.pricingFullProgramName
            if (plan === "trading_only") return t.pricingTradingOnlyName
            return typeof raw === "string" && raw.trim() ? raw.trim() : "—"
        },
        [t]
    )

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/trading-students", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const errObj = (payload ?? {}) as ErrorPayload
                throw new Error(
                    typeof errObj.error === "string" && errObj.error.trim()
                        ? errObj.error
                        : t.failedToLoadStudents
                )
            }
            const list = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
            setRows(
                list.map((r) => ({
                    id: typeof r.id === "string" ? r.id : "",
                    email: typeof r.email === "string" ? r.email : "",
                    first_name: typeof r.first_name === "string" ? r.first_name : null,
                    last_name: typeof r.last_name === "string" ? r.last_name : null,
                    phone: typeof r.phone === "string" ? r.phone : null,
                    plan: typeof r.plan === "string" ? r.plan : null,
                    access_type: typeof r.access_type === "string" ? r.access_type : "paid",
                    is_active: r.is_active !== false,
                    access_expires_at:
                        typeof r.access_expires_at === "string" ? r.access_expires_at : null,
                    subscription_status:
                        typeof r.subscription_status === "string" && r.subscription_status.trim()
                            ? r.subscription_status.trim()
                            : null,
                }))
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : t.errorLoadingStudents)
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [t.errorLoadingStudents, t.failedToLoadStudents])

    useEffect(() => {
        void load()
    }, [load])

    const filtered = useMemo(
        () => rows.filter((row) => matchesSearch(row, searchQuery)),
        [rows, searchQuery]
    )

    const openCreate = () => {
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setAccessType("free")
        setCreateError(null)
        setCreateOpen(true)
    }

    const closeCreate = () => {
        if (createBusy) return
        setCreateOpen(false)
        setCreateError(null)
    }

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (createBusy) return
        setCreateError(null)

        const trimmedFirst = firstName.trim()
        const trimmedLast = lastName.trim()
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedFirst || !trimmedLast || !trimmedEmail.includes("@")) {
            setCreateError(t.adminAppStudentsCreateInvalid)
            return
        }

        setCreateBusy(true)
        try {
            const res = await fetch("/api/admin/students/create", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    firstName: trimmedFirst,
                    lastName: trimmedLast,
                    email: trimmedEmail,
                    phone: phone.trim(),
                    accessType,
                }),
            })
            const payload = (await res.json().catch(() => ({}))) as ErrorPayload
            if (!res.ok || payload.success !== true) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.updateFailed
                )
            }
            setCreateOpen(false)
            setSuccessMessage(t.adminAppStudentsCreateSuccess)
            await load()
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : t.updateFailed)
        } finally {
            setCreateBusy(false)
        }
    }

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
                    {t.adminAppStudentsBackHome}
                </Link>

                <div className="mt-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 text-blue-300">
                        <Users className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {t.adminStudents}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            {t.adminAppStudentsSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            <div className="relative z-10 mb-3">
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-2.5 text-sm font-bold text-amber-100 transition active:bg-amber-500/25"
                >
                    + {t.adminNewStudent}
                </button>
            </div>

            <label className="relative z-10 mb-4 block">
                <span className="sr-only">{t.adminAppStudentsSearchHint}</span>
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <Search className="h-4 w-4" aria-hidden />
                </span>
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.adminAppStudentsSearchHint}
                    className="w-full rounded-xl border border-white/10 bg-[#111827]/95 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400/40"
                />
            </label>

            <section className="relative z-10 flex-1">
                {successMessage ? (
                    <p className="mb-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        {successMessage}
                    </p>
                ) : null}

                {loading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminAppStudentsLoading}
                    </p>
                ) : error && rows.length === 0 ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-8 text-center">
                        <p className="text-sm text-red-200">{error}</p>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-blue-500"
                        >
                            {t.adminAppStudentsRetry}
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-8 text-center text-sm text-slate-400">
                        {t.adminAppStudentsEmpty}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {error ? (
                            <li className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                {error}
                            </li>
                        ) : null}
                        {filtered.map((row) => {
                            const active = row.is_active !== false
                            const type = (row.access_type ?? "paid").toLowerCase()
                            return (
                                <li key={row.id || row.email}>
                                    <Link
                                        href={`/admin-app/students/${studentPathEmail(row.email)}`}
                                        className="block rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4 transition active:bg-white/[0.04]"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                                                {displayName(row)}
                                            </p>
                                            <span
                                                className={[
                                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    active
                                                        ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
                                                        : "border-slate-500/35 bg-slate-500/15 text-slate-300",
                                                ].join(" ")}
                                            >
                                                {active ? t.activeLabel : t.inactiveLabel}
                                            </span>
                                        </div>
                                        <p className="mt-1 truncate text-xs text-slate-400">
                                            {row.email}
                                        </p>
                                        <p className="mt-2 text-xs text-slate-500">
                                            {programLabel(row.plan)} · {type}
                                        </p>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>

            {createOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-student-title"
                >
                    <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl">
                        <h2 id="create-student-title" className="text-base font-bold text-white">
                            {t.adminNewStudent}
                        </h2>
                        <form className="mt-4 space-y-3" onSubmit={(e) => void handleCreate(e)}>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.firstNameLabel}
                                <input
                                    value={firstName}
                                    disabled={createBusy}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.lastNameLabel}
                                <input
                                    value={lastName}
                                    disabled={createBusy}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.emailLabel}
                                <input
                                    type="email"
                                    value={email}
                                    disabled={createBusy}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.adminAppStudentsPhone}
                                <input
                                    value={phone}
                                    disabled={createBusy}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-400">
                                {t.accessTypeLabel}
                                <select
                                    value={accessType}
                                    disabled={createBusy}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        if (
                                            (CREATE_ACCESS_TYPES as readonly string[]).includes(v)
                                        ) {
                                            setAccessType(v as (typeof CREATE_ACCESS_TYPES)[number])
                                        }
                                    }}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/40 disabled:opacity-50"
                                >
                                    {CREATE_ACCESS_TYPES.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {createError ? (
                                <p className="text-xs text-red-300">{createError}</p>
                            ) : null}
                            <button
                                type="submit"
                                disabled={createBusy}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition active:bg-blue-500 disabled:opacity-50"
                            >
                                {createBusy ? t.creating : t.adminAppStudentsCreate}
                            </button>
                            <button
                                type="button"
                                disabled={createBusy}
                                onClick={closeCreate}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition active:bg-white/[0.06] disabled:opacity-50"
                            >
                                {t.adminAppStudentsCancelAction}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
