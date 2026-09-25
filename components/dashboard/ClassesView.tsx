"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { useCallback, useEffect, useState } from "react"

type LessonSourceType = "youtube" | "upload"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string | null
    source_type?: LessonSourceType | string | null
    class_date?: string | null
    class_type?: string | null
    created_at: string
}

function formatLessonDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function resolveSourceType(lesson: Lesson): LessonSourceType {
    if (lesson.source_type === "upload") return "upload"
    if (lesson.source_type === "youtube") return "youtube"
    // Pre-migration / legacy rows
    return "youtube"
}

export default function ClassesView() {
    const { t } = useLanguage()
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
    const [playbackLoading, setPlaybackLoading] = useState(false)
    const [playbackError, setPlaybackError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError(null)
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
                    setError(e instanceof Error ? e.message : t.failedToLoadLessons)
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        return () => {
            cancelled = true
        }
    }, [t.failedToLoadLessons])

    const loadPlaybackUrl = useCallback(
        async (lessonId: string) => {
            setPlaybackLoading(true)
            setPlaybackError(null)
            setPlaybackUrl(null)
            try {
                const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/video`, {
                    cache: "no-store",
                    credentials: "include",
                })
                const payload = (await res.json().catch(() => ({}))) as {
                    ok?: unknown
                    url?: unknown
                    error?: unknown
                }
                if (!res.ok || payload.ok !== true || typeof payload.url !== "string") {
                    throw new Error(
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.recordedClassPlaybackError
                    )
                }
                setPlaybackUrl(payload.url)
            } catch (e) {
                setPlaybackUrl(null)
                setPlaybackError(
                    e instanceof Error ? e.message : t.recordedClassPlaybackError
                )
            } finally {
                setPlaybackLoading(false)
            }
        },
        [t.recordedClassPlaybackError]
    )

    useEffect(() => {
        if (!activeLesson) {
            setPlaybackUrl(null)
            setPlaybackError(null)
            setPlaybackLoading(false)
            return
        }
        if (resolveSourceType(activeLesson) !== "upload") {
            setPlaybackUrl(null)
            setPlaybackError(null)
            setPlaybackLoading(false)
            return
        }
        void loadPlaybackUrl(activeLesson.id)
    }, [activeLesson, loadPlaybackUrl])

    const activeSource = activeLesson ? resolveSourceType(activeLesson) : null
    const displayDate =
        activeLesson?.class_date && String(activeLesson.class_date).trim()
            ? formatLessonDate(String(activeLesson.class_date))
            : activeLesson
              ? formatLessonDate(activeLesson.created_at)
              : null

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">{t.myClassesTitle}</h2>
                <p className="text-white/60 mt-1">{t.selectLessonSubtitle}</p>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm lg:col-span-2">
                    {loading ? (
                        <p className="m-0 text-sm text-white/60">{t.loadingClasses}</p>
                    ) : error ? (
                        <p className="m-0 text-sm text-red-400">{error}</p>
                    ) : !activeLesson ? (
                        <p className="m-0 text-sm text-white/60">{t.noClassesAvailable}</p>
                    ) : (
                        <>
                            {activeSource === "youtube" ? (
                                <iframe
                                    src={activeLesson.video_url ?? ""}
                                    className="aspect-video w-full rounded-xl border border-white/10 bg-black shadow-lg lg:aspect-auto lg:h-[420px]"
                                    allowFullScreen
                                    title={activeLesson.title}
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                />
                            ) : playbackLoading ? (
                                <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-white/10 bg-black lg:h-[420px] lg:aspect-auto">
                                    <p className="text-sm text-white/60">{t.loading}</p>
                                </div>
                            ) : playbackError ? (
                                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-black px-4 lg:h-[420px] lg:aspect-auto">
                                    <p className="text-center text-sm text-red-300">{playbackError}</p>
                                    <button
                                        type="button"
                                        onClick={() => void loadPlaybackUrl(activeLesson.id)}
                                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
                                    >
                                        {t.recordedClassRetryPlayback}
                                    </button>
                                </div>
                            ) : playbackUrl ? (
                                <video
                                    key={playbackUrl}
                                    controls
                                    playsInline
                                    className="aspect-video w-full rounded-xl border border-white/10 bg-black shadow-lg lg:aspect-auto lg:h-[420px]"
                                    src={playbackUrl}
                                    onError={() => {
                                        setPlaybackError(t.recordedClassPlaybackExpired)
                                    }}
                                >
                                    <track kind="captions" />
                                </video>
                            ) : (
                                <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-white/10 bg-black lg:h-[420px] lg:aspect-auto">
                                    <p className="text-sm text-white/60">{t.recordedClassPlaybackError}</p>
                                </div>
                            )}

                            <div className="mt-4">
                                <div className="text-lg font-extrabold text-slate-50">
                                    {activeLesson.title}
                                </div>
                                {displayDate ? (
                                    <div className="mt-1 text-xs text-white/50">{displayDate}</div>
                                ) : null}
                                {activeLesson.class_type ? (
                                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                                        {activeLesson.class_type === "theory"
                                            ? t.recordedClassTypeTheory
                                            : t.recordedClassTypeTrading}
                                    </div>
                                ) : null}
                                {activeLesson.description ? (
                                    <div className="mt-2 text-sm leading-relaxed text-white/60">
                                        {activeLesson.description}
                                    </div>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>

                <aside className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm">
                    <div className="font-extrabold text-slate-50">{t.lessonsTitle}</div>
                    <div className="mt-4 max-h-[520px] overflow-auto pr-1">
                        {loading ? (
                            <p className="m-0 text-sm text-white/60">{t.loading}</p>
                        ) : lessons.length === 0 ? (
                            <p className="m-0 text-sm text-white/60">{t.noLessonsYet}</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {lessons.map((lesson) => {
                                    const active = activeLesson?.id === lesson.id
                                    const dateLabel =
                                        lesson.class_date && String(lesson.class_date).trim()
                                            ? formatLessonDate(String(lesson.class_date))
                                            : formatLessonDate(lesson.created_at)
                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => setActiveLesson(lesson)}
                                            className={[
                                                "w-full rounded-xl border px-3 py-3 text-left transition",
                                                "border-white/10",
                                                active
                                                    ? "bg-blue-600/10 text-blue-200"
                                                    : "bg-white/5 hover:bg-white/10",
                                            ].join(" ")}
                                        >
                                            <div className="truncate text-sm font-extrabold">
                                                {lesson.title}
                                            </div>
                                            <div className="mt-1 text-[12px] text-white/60">
                                                {dateLabel}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    )
}
