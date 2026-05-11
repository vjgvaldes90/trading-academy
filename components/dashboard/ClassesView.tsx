"use client"

import { useEffect, useState } from "react"

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

export default function ClassesView() {
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
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
                setActiveLesson(rows[0] ?? null)
            } catch (e) {
                if (!cancelled) {
                    setLessons([])
                    setActiveLesson(null)
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

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">Mis Clases</h2>
                <p className="text-white/60 mt-1">Selecciona una lección y continúa aprendiendo.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    {loading ? (
                        <p className="m-0 text-white/60 text-sm">Cargando clases…</p>
                    ) : error ? (
                        <p className="m-0 text-red-400 text-sm">{error}</p>
                    ) : !activeLesson ? (
                        <p className="m-0 text-white/60 text-sm">No hay clases disponibles.</p>
                    ) : (
                        <>
                            <iframe
                                src={activeLesson.video_url}
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

                <aside className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                    <div className="text-slate-50 font-extrabold">Lecciones</div>
                    <div className="mt-4 max-h-[520px] overflow-auto pr-1">
                        {loading ? (
                            <p className="m-0 text-white/60 text-sm">Cargando…</p>
                        ) : lessons.length === 0 ? (
                            <p className="m-0 text-white/60 text-sm">No lessons yet.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {lessons.map((lesson) => {
                                    const active = activeLesson?.id === lesson.id
                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => setActiveLesson(lesson)}
                                            className={[
                                                "w-full text-left rounded-xl border px-3 py-3 transition",
                                                "border-white/10",
                                                active ? "bg-blue-600/10 text-blue-200" : "bg-white/5 hover:bg-white/10",
                                            ].join(" ")}
                                        >
                                            <div className="text-sm font-extrabold truncate">{lesson.title}</div>
                                            <div className="mt-1 text-[12px] text-white/60">
                                                {formatLessonDate(lesson.created_at)}
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
