"use client"

import { useLanguage } from "@/context/LanguageProvider"
import {
    resolveLessonContentType,
    resolveRecordedClassCategory,
    type LessonContentType,
    type RecordedClassCategory,
} from "@/lib/recordedLessons"
import { ArrowLeft, BookOpen, CandlestickChart, FolderOpen, GraduationCap, type LucideIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import RecordedClassesView from "./RecordedClassesView"
import TutorialsView from "./TutorialsView"

type LessonSourceType = "youtube" | "upload" | "google_drive"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string | null
    source_type?: LessonSourceType | string | null
    content_type?: LessonContentType | string | null
    class_date?: string | null
    class_type?: string | null
    /** True when a private Google Drive download exists (served by /api/lessons/[id]/download). */
    has_download?: boolean
    created_at: string
}

type ClassesCategory = RecordedClassCategory | "tutorial"

function resolveSourceType(lesson: Lesson): LessonSourceType {
    if (lesson.source_type === "upload") return "upload"
    if (lesson.source_type === "youtube") return "youtube"
    if (lesson.source_type === "google_drive") return "google_drive"
    // Pre-migration / legacy rows
    return "youtube"
}

export default function ClassesView() {
    const { t } = useLanguage()
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [category, setCategory] = useState<ClassesCategory | null>(null)
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
        if (
            resolveLessonContentType(activeLesson.content_type) === "recorded_class" ||
            resolveSourceType(activeLesson) !== "upload"
        ) {
            setPlaybackUrl(null)
            setPlaybackError(null)
            setPlaybackLoading(false)
            return
        }
        void loadPlaybackUrl(activeLesson.id)
    }, [activeLesson, loadPlaybackUrl])

    const lessonsByCategory = useMemo(() => {
        const grouped: Record<ClassesCategory, Lesson[]> = { theory: [], trading: [], other: [], tutorial: [] }
        for (const lesson of lessons) {
            if (resolveLessonContentType(lesson.content_type) === "tutorial") {
                grouped.tutorial.push(lesson)
            } else {
                grouped[resolveRecordedClassCategory(lesson.class_type)].push(lesson)
            }
        }
        return grouped
    }, [lessons])

    const visibleLessons = category ? lessonsByCategory[category] : []

    const openCategory = (next: ClassesCategory) => {
        setCategory(next)
        setActiveLesson(lessonsByCategory[next][0] ?? null)
    }

    const backToCategories = () => {
        setCategory(null)
        setActiveLesson(null)
    }

    const recordedCategoryText: Record<RecordedClassCategory, { title: string; empty: string }> = {
        theory: { title: t.classesCategoryTheoryTitle, empty: t.classesNoTheoryRecordings },
        trading: { title: t.classesCategoryTradingTitle, empty: t.classesNoTradingRecordings },
        other: { title: t.classesCategoryOtherTitle, empty: t.classesNoOtherRecordings },
    }

    const categoryCards: { key: ClassesCategory; Icon: LucideIcon; title: string; description: string }[] = [
        {
            key: "theory",
            Icon: GraduationCap,
            title: t.classesCategoryTheoryTitle,
            description: t.classesCategoryTheoryDesc,
        },
        {
            key: "trading",
            Icon: CandlestickChart,
            title: t.classesCategoryTradingTitle,
            description: t.classesCategoryTradingDesc,
        },
        {
            key: "tutorial",
            Icon: BookOpen,
            title: t.classesCategoryTutorialsTitle,
            description: t.classesCategoryTutorialsDesc,
        },
    ]
    if (lessonsByCategory.other.length > 0) {
        categoryCards.push({
            key: "other",
            Icon: FolderOpen,
            title: t.classesCategoryOtherTitle,
            description: t.classesCategoryOtherDesc,
        })
    }

    const activeSource = activeLesson ? resolveSourceType(activeLesson) : null

    const tutorialPlayer = !activeLesson ? null : activeSource === "google_drive" ? null : activeSource === "youtube" ? (
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
            <p className="text-sm text-slate-300">{t.loading}</p>
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
            <p className="text-sm text-slate-300">{t.recordedClassPlaybackError}</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                    {category === "tutorial" ? t.classesCategoryTutorialsTitle : t.myClassesTitle}
                </h2>
                <p className="mt-1 text-slate-300">
                    {category === "tutorial"
                        ? t.classesCategoryTutorialsDesc
                        : category !== null
                          ? t.classesRecordedPageSubtitle
                          : t.selectLessonSubtitle}
                </p>
            </header>

            {category === null ? (
                loading ? (
                    <p className="m-0 text-sm text-slate-300">{t.loadingClasses}</p>
                ) : error ? (
                    <p className="m-0 text-sm text-red-400">{error}</p>
                ) : (
                    <div
                        className={[
                            "grid grid-cols-1 gap-4 sm:grid-cols-2",
                            categoryCards.length > 3 ? "xl:grid-cols-4" : "lg:grid-cols-3",
                        ].join(" ")}
                    >
                        {categoryCards.map(({ key, Icon, title, description }) => (
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
                                    <div className="mt-0.5 text-sm text-slate-300">{description}</div>
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

                    {category !== "tutorial" ? (
                        <RecordedClassesView
                            lessons={visibleLessons}
                            selected={activeLesson}
                            onSelect={setActiveLesson}
                            loading={loading}
                            error={error}
                            title={recordedCategoryText[category].title}
                            emptyText={recordedCategoryText[category].empty}
                        />
                    ) : (
                        <TutorialsView
                            lessons={visibleLessons}
                            selected={activeLesson}
                            onSelect={setActiveLesson}
                            loading={loading}
                            error={error}
                            player={tutorialPlayer}
                        />
                    )}
                </>
            )}
        </div>
    )
}
