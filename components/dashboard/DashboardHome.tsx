"use client"

import { useSession } from "@/context/SessionContext"
import {
    canShowStudentLiveJoinButton,
    getNextBookedSession,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"
import type { StudentDashboardView } from "@/components/student/Sidebar"
import QuickActions from "@/components/dashboard/QuickActions"
import { useEffect, useMemo, useState } from "react"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string
    created_at: string
}

function extractYouTubeId(url: string): string | null {
    const s = (url || "").trim()
    if (!s) return null
    const m1 = /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/.exec(s)
    if (m1?.[1]) return m1[1]
    const m2 = /v=([a-zA-Z0-9_-]+)/.exec(s)
    if (m2?.[1]) return m2[1]
    const m3 = /youtu\.be\/([a-zA-Z0-9_-]+)/.exec(s)
    if (m3?.[1]) return m3[1]
    return null
}

function thumbUrl(lesson: Lesson): string | null {
    const id = extractYouTubeId(lesson.video_url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export default function DashboardHome({
    userName,
    onWatchNow,
    activeView,
    setActiveView,
}: {
    userName: string
    onWatchNow: () => void
    activeView: StudentDashboardView
    setActiveView: (view: StudentDashboardView) => void
}) {
    const { sessions, bookingAccess, userEmail } = useSession()
    const [now, setNow] = useState(() => new Date())

    const [lessons, setLessons] = useState<Lesson[]>([])
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
    const [lessonsLoading, setLessonsLoading] = useState(true)
    const [lessonsError, setLessonsError] = useState<string | null>(null)

    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 30_000)
        return () => window.clearInterval(t)
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLessonsLoading(true)
            setLessonsError(null)
            try {
                const res = await fetch("/api/lessons", { cache: "no-store", credentials: "include" })
                const payload = (await res.json().catch(() => null)) as unknown
                if (!res.ok) {
                    const msg =
                        typeof (payload as { error?: unknown })?.error === "string"
                            ? String((payload as { error: unknown }).error)
                            : "Failed to load lessons"
                    throw new Error(msg)
                }
                const rows = Array.isArray(payload) ? (payload as Lesson[]) : []
                if (cancelled) return
                setLessons(rows)
                setActiveLesson(rows[0] ?? null)
            } catch (e) {
                if (!cancelled) {
                    setLessons([])
                    setActiveLesson(null)
                    setLessonsError(e instanceof Error ? e.message : "Failed to load lessons")
                }
            } finally {
                if (!cancelled) setLessonsLoading(false)
            }
        }
        void load()
        return () => {
            cancelled = true
        }
    }, [])

    const nextBooked = useMemo(() => getNextBookedSession(sessions, now), [sessions, now])
    const joinAllowed =
        nextBooked != null &&
        Boolean(userEmail) &&
        canShowStudentLiveJoinButton(nextBooked, now, {
            hasPaid: bookingAccess.canBook,
            hasReservation: true,
        })

    const nextClosed =
        nextBooked != null &&
        bookingAccess.canBook &&
        isStudentSecureJoinWindowClosed(nextBooked, now) &&
        !isStudentJoinTooEarly(nextBooked, now)

    const heroTitle = activeLesson?.title ?? (lessonsLoading ? "Cargando…" : "No hay clases disponibles")
    const heroThumb = activeLesson ? thumbUrl(activeLesson) : null

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold">Bienvenido de vuelta, {userName}</h1>
                <p className="text-white/60 mt-1">Continúa tu aprendizaje y alcanza tus metas.</p>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-r from-[#111827] to-[#0B1120] rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border border-white/10 shadow-sm">
                    <div className="min-w-0">
                        <div className="text-white/60 text-xs font-extrabold tracking-[0.18em] uppercase">
                            CONTINÚA APRENDIENDO
                        </div>
                        <div className="mt-2 text-slate-50 text-xl font-extrabold truncate">{heroTitle}</div>
                        <div className="mt-2 text-white/60 text-sm">Instructor: Smart Option Academy</div>
                        <div className="mt-4">
                            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full w-[38%] bg-blue-500/70 rounded-full" />
                            </div>
                            <div className="mt-2 text-white/60 text-xs">Progreso: 38%</div>
                        </div>
                    </div>

                    <div className="w-full lg:w-[280px] flex-shrink-0">
                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                            {heroThumb ? (
                                <img src={heroThumb} alt="" className="w-full h-[160px] object-cover" />
                            ) : (
                                <div className="w-full h-[160px] bg-white/5" />
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={!activeLesson}
                            onClick={onWatchNow}
                            className="mt-3 w-full rounded-xl bg-blue-600/20 text-blue-300 border border-white/10 px-4 py-2.5 font-extrabold hover:bg-white/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Reproducir ahora
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    <div className="text-slate-50 font-extrabold">Próxima Sesión en Vivo</div>
                    {!nextBooked ? (
                        <div className="mt-3 text-white/60 text-sm">No sessions scheduled</div>
                    ) : (
                        <div className="mt-4 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
                                    <div className="text-2xl font-extrabold text-slate-50">
                                        {(sessionDisplayDay(nextBooked).match(/\d{1,2}/)?.[0] ?? "").trim() || "—"}
                                    </div>
                                    <div className="text-white/60 text-xs">Día</div>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-slate-100 font-bold truncate">
                                        {nextBooked.title ?? "Sesión en vivo"}
                                    </div>
                                    <div className="text-white/60 text-sm">
                                        {sessionDisplayDay(nextBooked)} · {sessionDisplayHour(nextBooked) || "—"}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={!joinAllowed}
                                onClick={() => {
                                    if (!nextBooked || !joinAllowed) return
                                    window.location.assign(`/student/classroom/${nextBooked.id}`)
                                }}
                                className={[
                                    "rounded-xl px-4 py-2.5 font-extrabold transition border border-white/10",
                                    joinAllowed
                                        ? "bg-blue-600/20 text-blue-300 hover:bg-white/10"
                                        : "cursor-not-allowed bg-white/5 text-white/40",
                                ].join(" ")}
                            >
                                Unirse ahora
                            </button>
                            {nextClosed ? <div className="text-white/60 text-xs">Sesión cerrada</div> : null}
                        </div>
                    )}
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <QuickActions activeView={activeView} setActiveView={setActiveView} />

                <aside className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    <div className="text-slate-50 font-extrabold">Recent Classes</div>
                    <div className="mt-4 max-h-[420px] overflow-auto pr-1">
                        {lessonsLoading ? (
                            <p className="m-0 text-white/60 text-sm">Cargando…</p>
                        ) : lessonsError ? (
                            <p className="m-0 text-red-400 text-sm">{lessonsError}</p>
                        ) : lessons.length === 0 ? (
                            <p className="m-0 text-white/60 text-sm">No lessons yet.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {lessons.slice(0, 6).map((lesson) => {
                                    const t = thumbUrl(lesson)
                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => setActiveLesson(lesson)}
                                            className="w-full text-left rounded-xl border border-white/10 p-3 bg-white/5 hover:bg-white/10 transition"
                                        >
                                            <div className="flex gap-3">
                                                <div className="h-12 w-20 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                                                    {t ? <img src={t} alt="" className="h-full w-full object-cover" /> : null}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-extrabold text-sm truncate text-slate-100">
                                                        {lesson.title}
                                                    </div>
                                                    <div className="text-white/60 text-xs mt-1">
                                                        Instructor: Smart Option Academy
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </aside>
            </section>
        </div>
    )
}
