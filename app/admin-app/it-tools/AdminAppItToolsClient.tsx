"use client"

import type { AdminSessionRow } from "@/components/admin/liveSessions/types"
import { formatPrivateClassTime } from "@/components/dashboard/privateClassLabels"
import { getAuthorizedAdminEmailAction } from "@/app/actions/admin"
import { useLanguage } from "@/context/LanguageProvider"
import { isAuthorizedItAdminEmail } from "@/lib/adminEmails"
import { adminPrivateClassRequest } from "@/lib/privateClassRequests"
import {
    fetchSecureAdminItJoinUrl,
    fetchSecureAdminPrivateClassItJoinUrl,
} from "@/lib/secureJoinClient"
import { getMinutesUntilSessionStart, type DbSession } from "@/lib/sessions"
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    LifeBuoy,
    Users,
    Wrench,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

type AdminPrivateClassRequest = ReturnType<typeof adminPrivateClassRequest>

type ListErrorPayload = {
    error?: string
    details?: string
}

function toDbSession(row: AdminSessionRow): DbSession {
    return {
        id: row.id,
        day: null,
        date: row.date,
        time: row.time,
        link: null,
        session_type: row.session_type === "theory" ? "theory" : "trading",
    }
}

function byDateTimeAsc(a: AdminSessionRow, b: AdminSessionRow): number {
    const da = (a.date ?? "").localeCompare(b.date ?? "")
    if (da !== 0) return da
    return (a.time ?? "").localeCompare(b.time ?? "")
}

function formatSessionTime(raw: string | null | undefined): string {
    if (!raw) return "—"
    const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim())
    if (!m) return raw
    return `${m[1].padStart(2, "0")}:${m[2]}`
}

function byPrivateDateTimeAsc(
    a: AdminPrivateClassRequest,
    b: AdminPrivateClassRequest
): number {
    const da = String(a.requested_date ?? "").localeCompare(String(b.requested_date ?? ""))
    if (da !== 0) return da
    return String(a.requested_time ?? "").localeCompare(String(b.requested_time ?? ""))
}

export default function AdminAppItToolsClient() {
    const { t } = useLanguage()
    const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
    const [emailReady, setEmailReady] = useState(false)

    const [sessions, setSessions] = useState<AdminSessionRow[]>([])
    const [sessionsLoading, setSessionsLoading] = useState(true)
    const [sessionsError, setSessionsError] = useState<string | null>(null)

    const [privateClasses, setPrivateClasses] = useState<AdminPrivateClassRequest[]>([])
    const [privateLoading, setPrivateLoading] = useState(true)
    const [privateError, setPrivateError] = useState<string | null>(null)

    const [now, setNow] = useState(() => new Date())
    const [joiningKey, setJoiningKey] = useState<string | null>(null)
    const [joinError, setJoinError] = useState<string | null>(null)

    const isItAccount = isAuthorizedItAdminEmail(verifiedEmail)

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const email = await getAuthorizedAdminEmailAction()
                if (!cancelled) setVerifiedEmail(email)
            } catch {
                if (!cancelled) setVerifiedEmail(null)
            } finally {
                if (!cancelled) setEmailReady(true)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 30_000)
        return () => window.clearInterval(interval)
    }, [])

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true)
        setSessionsError(null)
        try {
            const res = await fetch("/api/admin/sessions", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const errObj = (payload ?? {}) as ListErrorPayload
                throw new Error(
                    typeof errObj.error === "string" && errObj.error.trim()
                        ? errObj.error
                        : t.adminAppItToolsLoadError
                )
            }
            setSessions(Array.isArray(payload) ? (payload as AdminSessionRow[]) : [])
        } catch (e) {
            setSessionsError(
                e instanceof Error ? e.message : t.adminAppItToolsLoadError
            )
            setSessions([])
        } finally {
            setSessionsLoading(false)
        }
    }, [t.adminAppItToolsLoadError])

    const loadPrivate = useCallback(async () => {
        setPrivateLoading(true)
        setPrivateError(null)
        try {
            const res = await fetch("/api/admin/private-class-requests?status=confirmed", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as {
                requests?: AdminPrivateClassRequest[]
                error?: string
            }
            if (!res.ok) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.adminAppItToolsLoadError
                )
            }
            const list = Array.isArray(payload.requests) ? payload.requests : []
            setPrivateClasses(list)
        } catch (e) {
            setPrivateError(
                e instanceof Error ? e.message : t.adminAppItToolsLoadError
            )
            setPrivateClasses([])
        } finally {
            setPrivateLoading(false)
        }
    }, [t.adminAppItToolsLoadError])

    useEffect(() => {
        void loadSessions()
        void loadPrivate()
    }, [loadSessions, loadPrivate])

    const upcomingSessions = useMemo(() => {
        return sessions
            .filter((row) => {
                const minutesUntil = getMinutesUntilSessionStart(toDbSession(row), now)
                return minutesUntil != null && minutesUntil >= 0
            })
            .sort(byDateTimeAsc)
    }, [sessions, now])

    const confirmedPrivateWithZoom = useMemo(() => {
        return privateClasses
            .filter((row) => {
                const status = String(row.status ?? "").trim().toLowerCase()
                if (status !== "confirmed") return false
                const join =
                    typeof row.zoom_join_url === "string" && row.zoom_join_url.trim()
                        ? row.zoom_join_url.trim()
                        : ""
                return Boolean(join)
            })
            .sort(byPrivateDateTimeAsc)
    }, [privateClasses])

    const openItJoinSession = async (sessionId: string) => {
        if (!isItAccount || joiningKey) return
        setJoinError(null)
        setJoiningKey(`session:${sessionId}`)
        try {
            const result = await fetchSecureAdminItJoinUrl(sessionId)
            if (!result.ok) {
                if (result.code === "it_only") {
                    throw new Error(t.adminAppItToolsForbidden)
                }
                throw new Error(result.message)
            }
            window.open(result.join_url, "_blank", "noopener,noreferrer")
        } catch (e) {
            setJoinError(e instanceof Error ? e.message : t.adminAppItToolsForbidden)
        } finally {
            setJoiningKey(null)
        }
    }

    const openItJoinPrivate = async (requestId: string) => {
        if (!isItAccount || joiningKey) return
        setJoinError(null)
        setJoiningKey(`private:${requestId}`)
        try {
            const result = await fetchSecureAdminPrivateClassItJoinUrl(requestId)
            if (!result.ok) {
                if (result.code === "it_only") {
                    throw new Error(t.adminAppItToolsForbidden)
                }
                throw new Error(result.message)
            }
            window.open(result.join_url, "_blank", "noopener,noreferrer")
        } catch (e) {
            setJoinError(e instanceof Error ? e.message : t.adminAppItToolsForbidden)
        } finally {
            setJoiningKey(null)
        }
    }

    const quickLinks = [
        {
            href: "/admin-app/support",
            title: t.adminSupport,
            Icon: LifeBuoy,
        },
        {
            href: "/admin-app/trading-sessions",
            title: t.adminLiveSessions,
            Icon: Calendar,
        },
        {
            href: "/admin-app/private-classes",
            title: t.adminPrivateClassRequests,
            Icon: BookOpen,
        },
        {
            href: "/admin-app/students",
            title: t.adminStudents,
            Icon: Users,
        },
    ] as const

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.14),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,0.12),transparent_36%)]"
            />

            <header className="relative z-10 mb-5 pr-[5.5rem]">
                <Link
                    href="/admin-app"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition active:bg-white/[0.06]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t.adminAppItToolsBackHome}
                </Link>

                <div className="mt-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
                        <Wrench className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {t.adminAppSectionItTools}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            {t.adminAppItToolsSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            {emailReady && !isItAccount ? (
                <p className="relative z-10 mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
                    {t.adminAppItToolsNotItAccount}
                </p>
            ) : null}

            {joinError ? (
                <p className="relative z-10 mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {joinError}
                </p>
            ) : null}

            <section className="relative z-10 mb-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.adminAppItToolsQuickLinks}
                </h2>
                <ul className="grid grid-cols-1 gap-2">
                    {quickLinks.map(({ href, title, Icon }) => (
                        <li key={href}>
                            <Link
                                href={href}
                                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111827]/95 px-4 py-3 transition active:bg-white/[0.04]"
                            >
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                                    {title}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                    {t.adminAppItToolsHostNotAvailable}
                </p>
            </section>

            <section className="relative z-10 mb-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t.adminAppItToolsSessionsTitle}
                    </h2>
                    <button
                        type="button"
                        onClick={() => void loadSessions()}
                        disabled={sessionsLoading}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-400 transition active:bg-white/[0.06] disabled:opacity-50"
                    >
                        {t.adminAppItToolsRetry}
                    </button>
                </div>

                {sessionsLoading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-6 text-center text-sm text-slate-400">
                        {t.adminAppItToolsLoading}
                    </p>
                ) : sessionsError ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-6 text-center">
                        <p className="text-sm text-red-200">{sessionsError}</p>
                        <button
                            type="button"
                            onClick={() => void loadSessions()}
                            className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                            {t.adminAppItToolsRetry}
                        </button>
                    </div>
                ) : upcomingSessions.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-6 text-center text-sm text-slate-400">
                        {t.adminAppItToolsEmptySessions}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {upcomingSessions.map((row) => {
                            const busy = joiningKey === `session:${row.id}`
                            return (
                                <li
                                    key={row.id}
                                    className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4"
                                >
                                    <p className="text-sm font-semibold text-white">
                                        {row.title?.trim() || t.liveSessionDefault}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {row.date ?? "—"} · {formatSessionTime(row.time)} ·{" "}
                                        {(row.session_type ?? "trading") === "theory"
                                            ? t.sessionTypeTheoryClass
                                            : t.sessionTypeTradingSession}
                                    </p>
                                    {isItAccount ? (
                                        <button
                                            type="button"
                                            disabled={Boolean(joiningKey)}
                                            onClick={() => void openItJoinSession(row.id)}
                                            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2.5 text-sm font-bold text-violet-100 transition active:bg-violet-500/25 disabled:opacity-50"
                                        >
                                            {busy
                                                ? t.adminAppItToolsJoining
                                                : t.adminAppItToolsEnterAsIt}
                                        </button>
                                    ) : null}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>

            <section className="relative z-10 mb-6">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t.adminAppItToolsPrivateTitle}
                    </h2>
                    <button
                        type="button"
                        onClick={() => void loadPrivate()}
                        disabled={privateLoading}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-400 transition active:bg-white/[0.06] disabled:opacity-50"
                    >
                        {t.adminAppItToolsRetry}
                    </button>
                </div>

                {privateLoading ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-6 text-center text-sm text-slate-400">
                        {t.adminAppItToolsLoading}
                    </p>
                ) : privateError ? (
                    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-6 text-center">
                        <p className="text-sm text-red-200">{privateError}</p>
                        <button
                            type="button"
                            onClick={() => void loadPrivate()}
                            className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                            {t.adminAppItToolsRetry}
                        </button>
                    </div>
                ) : confirmedPrivateWithZoom.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.08] bg-[#111827]/90 px-4 py-6 text-center text-sm text-slate-400">
                        {t.adminAppItToolsEmptyPrivate}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {confirmedPrivateWithZoom.map((row) => {
                            const busy = joiningKey === `private:${row.id}`
                            return (
                                <li
                                    key={row.id}
                                    className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-4"
                                >
                                    <p className="truncate text-sm font-semibold text-white">
                                        {row.student_email}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {row.requested_date} ·{" "}
                                        {formatPrivateClassTime(row.requested_time)}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                                        {t.adminPrivateClassZoomAvailable}
                                    </p>
                                    {isItAccount ? (
                                        <button
                                            type="button"
                                            disabled={Boolean(joiningKey)}
                                            onClick={() => void openItJoinPrivate(row.id)}
                                            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2.5 text-sm font-bold text-violet-100 transition active:bg-violet-500/25 disabled:opacity-50"
                                        >
                                            {busy
                                                ? t.adminAppItToolsJoining
                                                : t.adminAppItToolsEnterAsIt}
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
