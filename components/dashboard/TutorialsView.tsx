"use client"

import type { ReactNode } from "react"
import { useLanguage } from "@/context/LanguageProvider"
import { CalendarDays, GraduationCap, Play, PlayCircle } from "lucide-react"

export type TutorialLesson = {
    id: string
    title: string
    description: string | null
    class_date?: string | null
    created_at: string
}

function formatLessonDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function lessonDateLabel(lesson: TutorialLesson): string {
    return lesson.class_date && String(lesson.class_date).trim()
        ? formatLessonDate(String(lesson.class_date))
        : formatLessonDate(lesson.created_at)
}

/** Decorative "video lesson" illustration for the banner; purely visual. */
function LearningArtwork({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 360 180"
            preserveAspectRatio="xMidYMid slice"
            className={["pointer-events-none select-none", className].filter(Boolean).join(" ")}
            aria-hidden
            focusable="false"
        >
            <defs>
                <linearGradient id="tutorials-banner-screen" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#13254d" />
                    <stop offset="100%" stopColor="#0a1328" />
                </linearGradient>
                <linearGradient id="tutorials-banner-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect x="96" y="22" width="220" height="136" rx="14" fill="url(#tutorials-banner-screen)" stroke="#60a5fa" strokeOpacity="0.35" />
            {[58, 86, 114].map((y) => (
                <line key={y} x1="108" x2="304" y1={y} y2={y} stroke="#93c5fd" strokeOpacity="0.08" />
            ))}
            <polygon
                points="108,132 132,118 156,124 180,100 204,108 228,84 252,92 276,68 304,74 304,146 108,146"
                fill="url(#tutorials-banner-area)"
            />
            <polyline
                points="108,132 132,118 156,124 180,100 204,108 228,84 252,92 276,68 304,74"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            <circle cx="206" cy="90" r="24" fill="#2563eb" fillOpacity="0.9" />
            <circle cx="206" cy="90" r="32" fill="none" stroke="#60a5fa" strokeOpacity="0.35" />
            <path d="M199 79 L216 90 L199 101 Z" fill="#ffffff" />
            <rect x="108" y="146" width="196" height="4" rx="2" fill="#1e3a8a" fillOpacity="0.6" />
            <rect x="108" y="146" width="92" height="4" rx="2" fill="#60a5fa" />
            <rect x="24" y="40" width="56" height="10" rx="5" fill="#60a5fa" fillOpacity="0.35" />
            <rect x="24" y="60" width="44" height="8" rx="4" fill="#93c5fd" fillOpacity="0.2" />
            <rect x="24" y="76" width="50" height="8" rx="4" fill="#93c5fd" fillOpacity="0.2" />
            <rect x="24" y="92" width="38" height="8" rx="4" fill="#93c5fd" fillOpacity="0.2" />
        </svg>
    )
}

export default function TutorialsView<L extends TutorialLesson>({
    lessons,
    selected,
    onSelect,
    loading,
    error,
    player,
}: {
    lessons: L[]
    selected: L | null
    onSelect: (lesson: L) => void
    loading: boolean
    error: string | null
    /** Existing tutorial player (iframe / video), rendered as-is. */
    player: ReactNode
}) {
    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-[#0f1d3f] via-[#0d1830] to-[#0b1120] px-5 py-6 sm:px-8 sm:py-8">
                <LearningArtwork className="absolute inset-y-0 right-0 h-full w-2/3 opacity-60 [mask-image:linear-gradient(to_left,black,transparent)] sm:w-1/2" />
                <div className="relative max-w-xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-100">
                        <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                        {t.classesCategoryTutorialsTitle}
                    </span>
                    <p className="mt-3 text-lg font-extrabold text-slate-50 sm:text-xl">{t.tutorialsBannerTitle}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{t.tutorialsBannerText}</p>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                    {loading ? (
                        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                            <p className="m-0 text-sm text-slate-300">{t.loadingClasses}</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl border border-red-500/30 bg-[#111827] p-6">
                            <p className="m-0 text-sm text-red-300">{error}</p>
                        </div>
                    ) : !selected ? (
                        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                            <p className="m-0 text-sm text-slate-300">{t.noTutorialsYet}</p>
                        </div>
                    ) : (
                        <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121c33] to-[#0d1424] p-4 shadow-[0_24px_48px_-28px_rgba(37,99,235,0.55)] sm:p-6">
                            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-100">
                                <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                                {t.tutorialBadge}
                            </span>

                            <div className="w-full min-w-0">{player}</div>

                            <div className="mt-5">
                                <h3 className="text-xl font-extrabold leading-tight text-slate-50 sm:text-2xl">
                                    {selected.title}
                                </h3>
                                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
                                    <CalendarDays className="h-4 w-4 text-blue-300" aria-hidden />
                                    {lessonDateLabel(selected)}
                                </p>
                                {selected.description ? (
                                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{selected.description}</p>
                                ) : null}
                            </div>
                        </article>
                    )}
                </div>

                <aside className="rounded-2xl border border-white/10 bg-[#0f1729] p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-extrabold text-slate-50">{t.tutorialsAvailableTitle}</h3>
                        {!loading && !error ? (
                            <span className="rounded-full border border-blue-500/30 bg-blue-600/15 px-2.5 py-0.5 text-xs font-bold text-blue-100">
                                {t.classesCategoryCount.replace("{count}", String(lessons.length))}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-4 lg:max-h-[560px] lg:overflow-auto lg:pr-1">
                        {loading ? (
                            <p className="m-0 text-sm text-slate-300">{t.loading}</p>
                        ) : lessons.length === 0 ? (
                            <p className="m-0 text-sm text-slate-300">{t.noTutorialsYet}</p>
                        ) : (
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {lessons.map((lesson) => {
                                    const active = selected?.id === lesson.id
                                    return (
                                        <li key={lesson.id}>
                                            <button
                                                type="button"
                                                onClick={() => onSelect(lesson)}
                                                aria-current={active ? "true" : undefined}
                                                className={[
                                                    "group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                                                    active
                                                        ? "border-blue-500/60 bg-blue-600/15 shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_10px_24px_-14px_rgba(37,99,235,0.8)]"
                                                        : "border-white/10 bg-white/[0.03] hover:border-blue-400/30 hover:bg-white/[0.06]",
                                                ].join(" ")}
                                            >
                                                <span
                                                    className={[
                                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                                                        active
                                                            ? "border-blue-400 bg-blue-600 text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.9)]"
                                                            : "border-blue-400/30 bg-blue-500/10 text-blue-200 group-hover:bg-blue-600/30 group-hover:text-white",
                                                    ].join(" ")}
                                                >
                                                    <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
                                                </span>
                                                <span className="min-w-0">
                                                    <span
                                                        className={[
                                                            "block truncate text-sm font-bold",
                                                            active ? "text-white" : "text-slate-200",
                                                        ].join(" ")}
                                                    >
                                                        {lesson.title}
                                                    </span>
                                                    <span
                                                        className={[
                                                            "mt-0.5 flex items-center gap-1 text-xs",
                                                            active ? "text-blue-200" : "text-slate-400",
                                                        ].join(" ")}
                                                    >
                                                        <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
                                                        {lessonDateLabel(lesson)}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    )
}
