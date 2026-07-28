"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"
import ResourcesSection from "@/components/dashboard/focused/ResourcesSection"
import StudentNotificationsSection from "@/components/dashboard/focused/StudentNotificationsSection"
import { useSession } from "@/context/SessionContext"
import { useLanguage } from "@/context/LanguageProvider"
import {
    canShowStudentLiveJoinButton,
    getNextUpcomingSession,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string
    created_at: string
}

function formatLessonDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
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

export default function StudentDashboardPro({ userName }: { userName: string }) {
    const router = useRouter()
    const { sessions, academyAccess, userEmail } = useSession()
    const { t } = useLanguage()
    const [now, setNow] = useState(() => new Date())

    const [lessons, setLessons] = useState<Lesson[]>([])
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
    const [lessonsLoading, setLessonsLoading] = useState(true)
    const [lessonsError, setLessonsError] = useState<string | null>(null)

    const playerRef = useRef<HTMLDivElement | null>(null)

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
                            : t.failedToLoadLessons
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
                    setLessonsError(e instanceof Error ? e.message : t.failedToLoadLessons)
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

    const nextBooked = useMemo(() => getNextUpcomingSession(sessions, now), [sessions, now])
    const canJoinNext =
        Boolean(userEmail) &&
        Boolean(nextBooked) &&
        canShowStudentLiveJoinButton(nextBooked!, now, {
            hasPaid: academyAccess.canAccess,
        })

    const nextClosed =
        Boolean(nextBooked) &&
        academyAccess.canAccess &&
        isStudentSecureJoinWindowClosed(nextBooked!, now) &&
        !isStudentJoinTooEarly(nextBooked!, now)

    const heroTitle = activeLesson?.title ?? (lessonsLoading ? t.loading : t.noClassesAvailable)
    const heroThumb = activeLesson ? thumbUrl(activeLesson) : null

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <header>
                <h1 className="text-2xl font-semibold">
                    {t.welcomeBack} {userName}
                </h1>
                <p className="text-white/60 mt-1">{t.continueLearningSubtitle}</p>
            </header>

            {/* HERO + LIVE */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* HERO */}
                <div className="lg:col-span-2 bg-gradient-to-r from-[#111827] to-[#0B1120] rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border border-white/10 shadow-sm">
                    <div className="min-w-0">
                        <div className="text-white/60 text-xs font-extrabold tracking-[0.18em] uppercase">
                            {t.continueLearning}
                        </div>
                        <div className="mt-2 text-slate-50 text-xl font-extrabold truncate">{heroTitle}</div>
                        <div className="mt-2 text-white/60 text-sm">{t.instructorLabel}</div>
                        <div className="mt-4">
                            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full w-[38%] bg-blue-500/70 rounded-full" />
                            </div>
                            <div className="mt-2 text-white/60 text-xs">{t.progressLabel.replace("{percent}", "38")}</div>
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
                            onClick={() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            className="mt-3 w-full rounded-xl bg-blue-600/20 text-blue-300 border border-white/10 px-4 py-2.5 font-extrabold hover:bg-white/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {t.watchNow}
                        </button>
                    </div>
                </div>

                {/* NEXT LIVE SESSION */}
                <div id="live-sessions" className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    <div className="text-slate-50 font-extrabold">{t.nextLiveSession}</div>
                    {!nextBooked ? (
                        <div className="mt-3 text-white/60 text-sm">{t.noSessionsScheduled}</div>
                    ) : (
                        <div className="mt-4 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
                                    <div className="text-2xl font-extrabold text-slate-50">
                                        {(sessionDisplayDay(nextBooked).match(/\d{1,2}/)?.[0] ?? "").trim() || "—"}
                                    </div>
                                    <div className="text-white/60 text-xs">{t.dayLabel}</div>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-slate-100 font-bold truncate">
                                        {nextBooked.title ?? t.liveSessionDefault}
                                    </div>
                                    <div className="text-white/60 text-sm">
                                        {sessionDisplayDay(nextBooked)} · {sessionDisplayHour(nextBooked) || "—"}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={!canJoinNext}
                                onClick={() => router.push(`/student/classroom/${nextBooked.id}`)}
                                className={[
                                    "rounded-xl px-4 py-2.5 font-extrabold transition",
                                    canJoinNext
                                        ? "bg-blue-600/20 text-blue-300 border border-white/10 hover:bg-white/10"
                                        : "cursor-not-allowed bg-white/5 text-white/40 border border-white/10",
                                ].join(" ")}
                            >
                                {t.joinLiveSession}
                            </button>
                            {nextClosed ? (
                                <div className="text-white/60 text-xs">{t.sessionClosed}</div>
                            ) : null}
                        </div>
                    )}
                </div>
            </section>

            {/* VIDEO + RECENT */}
            <section id="mis-clases" ref={playerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* VIDEO PLAYER */}
                <div className="lg:col-span-2 rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    {!activeLesson ? (
                        lessonsLoading ? (
                            <p className="m-0 text-white/60 text-sm">{t.loadingClasses}</p>
                        ) : lessonsError ? (
                            <p className="m-0 text-red-400 text-sm">{lessonsError}</p>
                        ) : (
                            <p className="m-0 text-white/60 text-sm">{t.noClassesAvailable}</p>
                        )
                    ) : (
                        <>
                            <iframe
                                src={activeLesson?.video_url}
                                className="w-full h-[420px] rounded-xl shadow-lg border border-white/10 bg-black"
                                allowFullScreen
                                title={activeLesson.title}
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            />
                            <div className="mt-4">
                                <div className="text-slate-50 text-lg font-extrabold">{activeLesson.title}</div>
                                {activeLesson.description ? (
                                    <div className="mt-2 text-white/60 text-sm leading-relaxed">
                                        {activeLesson.description}
                                    </div>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>

                {/* RECENT CLASSES */}
                <aside className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    <div className="text-slate-50 font-extrabold">{t.recentClasses}</div>
                    <div className="mt-4 max-h-[520px] overflow-auto pr-1">
                        {lessonsLoading ? (
                            <p className="m-0 text-white/60 text-sm">{t.loading}</p>
                        ) : lessonsError ? (
                            <p className="m-0 text-red-400 text-sm">{lessonsError}</p>
                        ) : lessons.length === 0 ? (
                            <p className="m-0 text-white/60 text-sm">{t.noLessonsYet}</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {lessons.slice(0, 8).map((lesson) => {
                                    const active = activeLesson?.id === lesson.id
                                    const thumb = thumbUrl(lesson)
                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => setActiveLesson(lesson)}
                                            className={[
                                                "w-full text-left rounded-xl border border-white/10 p-3 hover:bg-white/10 transition",
                                                active ? "bg-blue-600/10" : "bg-white/5",
                                            ].join(" ")}
                                        >
                                            <div className="flex gap-3">
                                                <div className="h-12 w-20 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                                                    {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className={["font-extrabold text-sm truncate", active ? "text-blue-200" : "text-slate-100"].join(" ")}>
                                                        {lesson.title}
                                                    </div>
                                                    <div className="text-white/60 text-xs mt-1">{t.instructorLabel}</div>
                                                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                                        <div className="h-full w-[38%] bg-blue-500/60 rounded-full" />
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

            {/* QUICK ACTIONS */}
            <section aria-label={t.quickActionsAria}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <a href="#sesiones-en-vivo" className="bg-[#111827] p-4 rounded-xl border border-white/10 hover:bg-white/10 transition">
                        <div className="font-extrabold">{t.quickActionLiveTitle}</div>
                        <div className="text-white/60 text-sm mt-1">{t.quickActionLiveDesc}</div>
                    </a>
                    <a href="#mis-clases" className="bg-[#111827] p-4 rounded-xl border border-white/10 hover:bg-white/10 transition">
                        <div className="font-extrabold">{t.watchClasses}</div>
                        <div className="text-white/60 text-sm mt-1">{t.quickActionClassesDesc}</div>
                    </a>
                    <div className="bg-[#111827] p-4 rounded-xl border border-white/10 hover:bg-white/10 transition">
                        <div className="font-extrabold">{t.community}</div>
                        <div className="text-white/60 text-sm mt-1">{t.comingSoon}</div>
                    </div>
                </div>
            </section>

            <section id="sesiones-en-vivo-card" className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <BookSessionSection />
            </section>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <StudentNotificationsSection />
                    <div id="recursos">
                        <ResourcesSection />
                    </div>
                </div>
            </section>
        </div>
    )
}

