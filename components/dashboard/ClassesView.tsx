"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { resolveLessonContentType, type LessonContentType } from "@/lib/recordedLessons"
import { ArrowLeft, BookOpen, Video } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

type LessonSourceType = "youtube" | "upload"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string | null
    source_type?: LessonSourceType | string | null
    content_type?: LessonContentType | string | null
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
    const [category, setCategory] = useState<LessonContentType | null>(null)
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

    const lessonsByCategory = useMemo(() => {
        const grouped: Record<LessonContentType, Lesson[]> = { recorded_class: [], tutorial: [] }
        for (const lesson of lessons) {
            grouped[resolveLessonContentType(lesson.content_type)].push(lesson)
        }
        return grouped
    }, [lessons])

    const visibleLessons = category ? lessonsByCategory[category] : []

    const openCategory = (next: LessonContentType) => {
        setCategory(next)
        setActiveLesson(lessonsByCategory[next][0] ?? null)
    }

    const backToCategories = () => {
        setCategory(null)
        setActiveLesson(null)
    }

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
                <h2 className="text-xl font-semibold">
                    {category === "tutorial"
                        ? t.classesCategoryTutorialsTitle
                        : category === "recorded_class"
                          ? t.classesCategoryRecordedTitle
                          : t.myClassesTitle}
                </h2>
                <p className="text-white/60 mt-1">
                    {category === "tutorial"
                        ? t.classesCategoryTutorialsDesc
                        : category === "recorded_class"
                          ? t.classesCategoryRecordedDesc
                          : t.selectLessonSubtitle}
                </p>
            </header>

            {category === null ? (
                loading ? (
                    <p className="m-0 text-sm text-white/60">{t.loadingClasses}</p>
                ) : error ? (
                    <p className="m-0 text-sm text-red-400">{error}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {(
                            [
                                {
                                    key: "recorded_class",
                                    Icon: Video,
                                    title: t.classesCategoryRecordedTitle,
                                    description: t.classesCategoryRecordedDesc,
                                },
                                {
                                    key: "tutorial",
                                    Icon: BookOpen,
                                    title: t.classesCategoryTutorialsTitle,
                                    description: t.classesCategoryTutorialsDesc,
                                },
                            ] as const
                        ).map(({ key, Icon, title, description }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => openCategory(key)}
                                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111827] p-6 text-left shadow-sm transition-all duration-200 hover:border-blue-500/30 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-blue-600/20 text-blue-300">
                                    <Icon className="h-6 w-6" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base font-extrabold text-slate-50">{title}</div>
                                    <div className="mt-0.5 text-sm text-white/60">{description}</div>
                                    <div className="mt-1 text-xs font-semibold text-blue-200/80">
                                        {t.classesCategoryCount.replace(
                                            "{count}",
                                            String(lessonsByCategory[key].length)
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            ) : (
                <>
                    <button
                        type="button"
                        onClick={backToCategories}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                        {t.classesBackToCategories}
                    </button>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm lg:col-span-2">
                            {loading ? (
                                <p className="m-0 text-sm text-white/60">{t.loadingClasses}</p>
                            ) : error ? (
                                <p className="m-0 text-sm text-red-400">{error}</p>
                            ) : !activeLesson ? (
                                <p className="m-0 text-sm text-white/60">
                                    {category === "tutorial" ? t.noTutorialsYet : t.noClassesAvailable}
                                </p>
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
                                ) : visibleLessons.length === 0 ? (
                                    <p className="m-0 text-sm text-white/60">
                                        {category === "tutorial" ? t.noTutorialsYet : t.noLessonsYet}
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {visibleLessons.map((lesson) => {
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
                </>
            )}
        </div>
    )
}
