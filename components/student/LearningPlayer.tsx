"use client"

import { useEffect, useMemo, useState } from "react"

type Lesson = {
    id: string
    title: string
    description: string | null
    video_url: string
    created_at: string
}

function formatCreatedAt(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function LearningPlayer() {
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [activeLesson, setActiveLesson] = useState<Lesson | undefined>(undefined)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
                            : "Failed to load lessons"
                    throw new Error(msg)
                }

                const rows = Array.isArray(payload) ? (payload as Lesson[]) : []
                if (cancelled) return
                setLessons(rows)
                setActiveLesson(rows[0])
            } catch (e) {
                if (!cancelled) {
                    setLessons([])
                    setActiveLesson(undefined)
                    setError(e instanceof Error ? e.message : "Failed to load lessons")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [])

    const activeLessonId = activeLesson?.id ?? null

    const sidebar = useMemo(() => {
        if (loading) {
            return <p className="text-slate-400 text-sm m-0">Loading…</p>
        }
        if (error) {
            return <p className="text-red-400 text-sm m-0">{error}</p>
        }
        if (lessons.length === 0) {
            return <p className="text-slate-400 text-sm m-0">No lessons available yet.</p>
        }

        return (
            <div className="flex flex-col gap-2">
                {lessons.map((lesson) => {
                    const active = activeLessonId === lesson.id
                    return (
                        <button
                            key={lesson.id}
                            type="button"
                            onClick={() => setActiveLesson(lesson)}
                            className={[
                                "w-full text-left rounded-xl border px-3 py-3 transition",
                                active
                                    ? "border-blue-500/50 bg-blue-900/20"
                                    : "border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-600/60",
                            ].join(" ")}
                        >
                            <div className={["font-extrabold text-sm", active ? "text-blue-200" : "text-slate-100"].join(" ")}>
                                {lesson.title}
                            </div>
                            <div className="mt-1 text-[12px] text-slate-400">{formatCreatedAt(lesson.created_at)}</div>
                        </button>
                    )
                })}
            </div>
        )
    }, [activeLessonId, error, lessons, loading])

    return (
        <section aria-label="Learning player">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl border border-blue-500/20 bg-gradient-to-br from-slate-900/60 to-[#0B0F1A] p-4 shadow-[0_20px_30px_-20px_rgba(59,130,246,0.25)]">
                    {loading ? (
                        <p className="m-0 text-slate-400 text-sm">Loading…</p>
                    ) : error ? (
                        <p className="m-0 text-red-400 text-sm">{error}</p>
                    ) : !activeLesson ? (
                        <p className="m-0 text-slate-400 text-sm">No lesson selected.</p>
                    ) : (
                        <>
                            <iframe
                                src={activeLesson.video_url}
                                className="w-full h-[400px] rounded-xl border border-slate-700/60 bg-black"
                                allowFullScreen
                                title={activeLesson.title}
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            />
                            <div className="mt-4">
                                <div className="text-slate-50 font-extrabold text-lg">{activeLesson.title}</div>
                                {activeLesson.description ? (
                                    <div className="mt-2 text-slate-400 text-sm leading-relaxed">
                                        {activeLesson.description}
                                    </div>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>

                <aside className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-slate-900/60 to-[#0B0F1A] p-4 shadow-[0_20px_30px_-20px_rgba(59,130,246,0.25)]">
                    <div className="mb-3 text-blue-200 font-extrabold text-sm">Lessons</div>
                    {sidebar}
                </aside>
            </div>
        </section>
    )
}

