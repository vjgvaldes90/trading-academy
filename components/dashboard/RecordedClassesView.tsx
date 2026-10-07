"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { CalendarDays, Download, Loader2, Video } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

export type RecordedClassLesson = {
    id: string
    title: string
    description: string | null
    class_date?: string | null
    class_type?: string | null
    /** True when a private Google Drive download exists (served by /api/lessons/[id]/download). */
    has_download?: boolean
    created_at: string
}

const DOWNLOAD_BUTTON_COOLDOWN_MS = 4000

function useRecordedClassDownload(lessonId: string) {
    const { t } = useLanguage()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearTimeout(cooldownRef.current)
        }
    }, [])

    const start = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        const url = `/api/lessons/${encodeURIComponent(lessonId)}/download`
        try {
            const res = await fetch(`${url}?check=1`, { cache: "no-store", credentials: "include" })
            const payload = (await res.json().catch(() => ({}))) as { ok?: unknown }
            if (!res.ok || payload.ok !== true) {
                throw new Error(t.recordedClassDownloadUnavailable)
            }
            window.location.assign(url)
            cooldownRef.current = setTimeout(() => setBusy(false), DOWNLOAD_BUTTON_COOLDOWN_MS)
        } catch (e) {
            setError(e instanceof Error ? e.message : t.recordedClassDownloadUnavailable)
            setBusy(false)
        }
    }

    return { busy, error, start }
}

function hashSeed(value: string): number {
    let h = 2166136261
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function seededRandom(seed: number): () => number {
    let a = seed
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let r = Math.imul(a ^ (a >>> 15), 1 | a)
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
}

type Candle = { x: number; open: number; close: number; high: number; low: number }

const ART_WIDTH = 320
const ART_HEIGHT = 180

function buildCandles(seed: string, count: number): Candle[] {
    const rand = seededRandom(hashSeed(seed))
    const toY = (v: number) => ART_HEIGHT - 24 - v * (ART_HEIGHT - 52)
    const step = ART_WIDTH / (count + 1)
    const candles: Candle[] = []
    let price = 0.35 + rand() * 0.2
    for (let i = 0; i < count; i++) {
        const open = price
        const close = Math.min(0.92, Math.max(0.08, open + (rand() - 0.42) * 0.2))
        const high = Math.min(1, Math.max(open, close) + rand() * 0.07)
        const low = Math.max(0, Math.min(open, close) - rand() * 0.07)
        candles.push({ x: step * (i + 1), open: toY(open), close: toY(close), high: toY(high), low: toY(low) })
        price = close
    }
    return candles
}

/** Decorative market chart; purely visual (no data, not interactive). */
function TradingArtwork({
    seed,
    candles: count = 14,
    showGrid = true,
    className,
}: {
    seed: string
    candles?: number
    showGrid?: boolean
    className?: string
}) {
    const gradientId = `ta-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`
    const candles = useMemo(() => buildCandles(seed, count), [seed, count])
    const bodyWidth = Math.max(4, (ART_WIDTH / (count + 1)) * 0.45)
    const trend = candles.map((c) => `${c.x.toFixed(1)},${c.close.toFixed(1)}`).join(" ")

    return (
        <svg
            viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            className={["pointer-events-none select-none", className].filter(Boolean).join(" ")}
            aria-hidden
            focusable="false"
        >
            <defs>
                <linearGradient id={`${gradientId}-bg`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0f1d3f" />
                    <stop offset="60%" stopColor="#0b1328" />
                    <stop offset="100%" stopColor="#070b17" />
                </linearGradient>
                <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect width={ART_WIDTH} height={ART_HEIGHT} fill={`url(#${gradientId}-bg)`} />
            {showGrid
                ? [36, 72, 108, 144].map((y) => (
                      <line key={y} x1="0" x2={ART_WIDTH} y1={y} y2={y} stroke="#93c5fd" strokeOpacity="0.08" />
                  ))
                : null}
            {candles.length > 1 ? (
                <polygon
                    points={`${candles[0].x},${ART_HEIGHT} ${trend} ${candles[candles.length - 1].x},${ART_HEIGHT}`}
                    fill={`url(#${gradientId}-area)`}
                />
            ) : null}
            {candles.map((c) => {
                const up = c.close <= c.open
                const color = up ? "#34d399" : "#f87171"
                const top = Math.min(c.open, c.close)
                const height = Math.max(2, Math.abs(c.open - c.close))
                return (
                    <g key={c.x} opacity="0.9">
                        <line x1={c.x} x2={c.x} y1={c.high} y2={c.low} stroke={color} strokeWidth="1.5" />
                        <rect x={c.x - bodyWidth / 2} y={top} width={bodyWidth} height={height} rx="1" fill={color} />
                    </g>
                )
            })}
            <polyline points={trend} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    )
}

function formatLessonDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function lessonDateLabel(lesson: RecordedClassLesson): string {
    return lesson.class_date && String(lesson.class_date).trim()
        ? formatLessonDate(String(lesson.class_date))
        : formatLessonDate(lesson.created_at)
}

function RecordedClassListItem({
    lesson,
    selected,
    onSelect,
}: {
    lesson: RecordedClassLesson
    selected: boolean
    onSelect: () => void
}) {
    const { t } = useLanguage()
    const download = useRecordedClassDownload(lesson.id)
    const canDownload = lesson.has_download === true

    return (
        <li>
            <div
                className={[
                    "flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-200",
                    selected
                        ? "border-blue-500/60 bg-blue-600/15 shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_10px_24px_-14px_rgba(37,99,235,0.8)]"
                        : "border-white/10 bg-white/[0.03] hover:border-blue-400/30 hover:bg-white/[0.06]",
                ].join(" ")}
            >
                <button
                    type="button"
                    onClick={onSelect}
                    aria-current={selected ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                    <span
                        className={[
                            "relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border",
                            selected ? "border-blue-400/50" : "border-white/10",
                        ].join(" ")}
                    >
                        <TradingArtwork seed={lesson.id} candles={7} showGrid={false} className="h-full w-full" />
                    </span>
                    <span className="min-w-0">
                        <span
                            className={[
                                "block truncate text-sm font-bold",
                                selected ? "text-white" : "text-slate-200",
                            ].join(" ")}
                        >
                            {lesson.title}
                        </span>
                        <span
                            className={[
                                "mt-0.5 flex items-center gap-1 text-xs",
                                selected ? "text-blue-200" : "text-slate-400",
                            ].join(" ")}
                        >
                            <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
                            {lessonDateLabel(lesson)}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => void download.start()}
                    disabled={!canDownload || download.busy}
                    aria-label={`${t.recordedClassDownload}: ${lesson.title}`}
                    title={canDownload ? t.recordedClassDownload : t.classesRecordedNotDownloadable}
                    className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
                        canDownload
                            ? "border-blue-500/40 bg-blue-600/20 text-blue-100 hover:bg-blue-600/40 hover:text-white"
                            : "cursor-not-allowed border-white/10 bg-white/[0.03] text-slate-500",
                        download.busy ? "cursor-wait opacity-70" : "",
                    ].join(" ")}
                >
                    {download.busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                        <Download className="h-4 w-4" aria-hidden />
                    )}
                </button>
            </div>
            {download.error ? <p className="mt-1 px-1 text-xs text-red-300">{download.error}</p> : null}
        </li>
    )
}

function SelectedRecordedClassCard({ lesson }: { lesson: RecordedClassLesson }) {
    const { t } = useLanguage()
    const download = useRecordedClassDownload(lesson.id)
    const canDownload = lesson.has_download === true
    const categoryLabel =
        lesson.class_type === "theory"
            ? t.recordedClassTypeTheory
            : lesson.class_type === "trading"
              ? t.recordedClassTypeTrading
              : t.classesCategoryRecordedTitle
    const dateLabel = lessonDateLabel(lesson)

    const meta: { label: string; value: string }[] = [
        { label: t.classesRecordedMetaCategory, value: categoryLabel },
        { label: t.classesRecordedMetaDate, value: dateLabel },
        {
            label: t.classesRecordedMetaDownload,
            value: canDownload ? t.classesRecordedDownloadAvailable : t.classesRecordedDownloadNotAvailable,
        },
    ]

    return (
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121c33] to-[#0d1424] shadow-[0_24px_48px_-28px_rgba(37,99,235,0.55)]">
            <div className="relative aspect-[16/7] w-full sm:aspect-[16/6]">
                <TradingArtwork seed={lesson.id} className="absolute inset-0 h-full w-full" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d1424] via-[#0d1424]/30 to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-[#0b1328]/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-100 backdrop-blur-sm">
                    <Video className="h-3.5 w-3.5" aria-hidden />
                    {categoryLabel}
                </span>
            </div>

            <div className="p-5 sm:p-6">
                <h3 className="text-xl font-extrabold leading-tight text-slate-50 sm:text-2xl">{lesson.title}</h3>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-300">
                    <CalendarDays className="h-4 w-4 text-blue-300" aria-hidden />
                    {dateLabel}
                </p>
                {lesson.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{lesson.description}</p>
                ) : null}

                <div className="mt-5">
                    <button
                        type="button"
                        onClick={() => void download.start()}
                        disabled={!canDownload || download.busy}
                        className={[
                            "inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold transition-all duration-200 sm:w-auto",
                            canDownload
                                ? "bg-blue-600 text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.9)] hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                                : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-400",
                            download.busy ? "cursor-wait opacity-80 hover:translate-y-0" : "",
                        ].join(" ")}
                    >
                        {download.busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                            <Download className="h-4 w-4" aria-hidden />
                        )}
                        {download.busy ? t.recordedClassDownloadPreparing : t.recordedClassDownload}
                    </button>
                    {!canDownload ? (
                        <p className="mt-2 text-xs text-amber-200">{t.classesRecordedNotDownloadable}</p>
                    ) : null}
                    {download.error ? <p className="mt-2 text-xs text-red-300">{download.error}</p> : null}
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
                    {meta.map((item) => (
                        <div key={item.label} className="sm:px-4 sm:first:pl-0">
                            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                {item.label}
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-100">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </article>
    )
}

export default function RecordedClassesView<L extends RecordedClassLesson>({
    lessons,
    selected,
    onSelect,
    loading,
    error,
}: {
    lessons: L[]
    selected: L | null
    onSelect: (lesson: L) => void
    loading: boolean
    error: string | null
}) {
    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-[#0f1d3f] via-[#0d1830] to-[#0b1120] px-5 py-6 sm:px-8 sm:py-8">
                <TradingArtwork
                    seed="smart-option-recorded-classes"
                    candles={22}
                    className="absolute inset-y-0 right-0 h-full w-2/3 opacity-50 [mask-image:linear-gradient(to_left,black,transparent)] sm:w-1/2"
                />
                <div className="relative max-w-xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-200">
                        <Video className="h-3.5 w-3.5" aria-hidden />
                        {t.classesCategoryRecordedTitle}
                    </span>
                    <p className="mt-3 text-lg font-extrabold text-slate-50 sm:text-xl">
                        {t.classesRecordedBannerTitle}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{t.classesRecordedBannerText}</p>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    {loading ? (
                        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                            <p className="m-0 text-sm text-slate-300">{t.loadingClasses}</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl border border-red-500/30 bg-[#111827] p-6">
                            <p className="m-0 text-sm text-red-300">{error}</p>
                        </div>
                    ) : selected ? (
                        <SelectedRecordedClassCard key={selected.id} lesson={selected} />
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                            <p className="m-0 text-sm text-slate-300">{t.noClassesAvailable}</p>
                        </div>
                    )}
                </div>

                <aside className="rounded-2xl border border-white/10 bg-[#0f1729] p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-extrabold text-slate-50">{t.classesCategoryRecordedTitle}</h3>
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
                            <p className="m-0 text-sm text-slate-300">{t.noClassesAvailable}</p>
                        ) : (
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {lessons.map((lesson) => (
                                    <RecordedClassListItem
                                        key={lesson.id}
                                        lesson={lesson}
                                        selected={selected?.id === lesson.id}
                                        onSelect={() => onSelect(lesson)}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    )
}
