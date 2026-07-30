"use client"

import { formatSupportDate } from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import type { StudentAnnouncementItem } from "@/lib/announcements"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

function priorityIcon(priority: StudentAnnouncementItem["priority"]): string {
    if (priority === "critical") return "🚨"
    if (priority === "important") return "⚠️"
    return "ℹ️"
}

function priorityBadgeClass(priority: StudentAnnouncementItem["priority"]): string {
    if (priority === "critical") return "border-red-400/30 bg-red-500/15 text-red-100"
    if (priority === "important") return "border-amber-400/30 bg-amber-500/15 text-amber-100"
    return "border-blue-400/25 bg-blue-500/10 text-blue-200"
}

type AnnouncementsViewProps = {
    announcements: StudentAnnouncementItem[]
    loading: boolean
    error: boolean
    focusAnnouncementId?: string | null
    onRetry: () => void
    onAcknowledge: (announcement: StudentAnnouncementItem) => Promise<void>
}

export default function AnnouncementsView({
    announcements,
    loading,
    error,
    focusAnnouncementId = null,
    onRetry,
    onAcknowledge,
}: AnnouncementsViewProps) {
    const { t, language } = useLanguage()
    const cardRefs = useRef<Record<string, HTMLElement | null>>({})
    const [ackingId, setAckingId] = useState<string | null>(null)
    const [highlightedId, setHighlightedId] = useState<string | null>(null)

    const priorityLabel = useCallback(
        (priority: StudentAnnouncementItem["priority"]) => {
            if (priority === "critical") return t.announcementsPriorityCritical
            if (priority === "important") return t.announcementsPriorityImportant
            return t.announcementsPriorityNormal
        },
        [t]
    )

    useEffect(() => {
        if (!focusAnnouncementId) return
        const el = cardRefs.current[focusAnnouncementId]
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        setHighlightedId(focusAnnouncementId)
        const timer = window.setTimeout(() => {
            setHighlightedId((prev) => (prev === focusAnnouncementId ? null : prev))
        }, 1800)
        return () => window.clearTimeout(timer)
    }, [focusAnnouncementId, announcements])

    const handleAcknowledge = async (item: StudentAnnouncementItem) => {
        if (ackingId) return
        setAckingId(item.id)
        try {
            await onAcknowledge(item)
        } finally {
            setAckingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">{t.announcementsTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">{t.announcementsSubtitle}</p>
            </header>

            {loading ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 py-16 text-sm text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" aria-hidden />
                    <span>{t.announcementsLoading}</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 py-16 text-center">
                    <p className="text-sm text-red-400">{t.announcementsLoadError}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
                    >
                        {t.announcementsRetry}
                    </button>
                </div>
            ) : announcements.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-16 text-center"
                >
                    <p className="text-3xl" aria-hidden>
                        🎉
                    </p>
                    <p className="mt-3 text-base font-semibold text-slate-100">
                        {t.announcementsEmptyTitle}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">{t.announcementsEmpty}</p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence initial={false} mode="popLayout">
                        {announcements.map((item) => {
                            const isFocused = focusAnnouncementId === item.id
                            const isHighlighted = highlightedId === item.id
                            return (
                                <motion.article
                                    key={item.id}
                                    id={`announcement-${item.id}`}
                                    ref={(node) => {
                                        cardRefs.current[item.id] = node
                                    }}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{
                                        opacity: 0,
                                        y: -6,
                                        height: 0,
                                        marginTop: 0,
                                        marginBottom: 0,
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                        borderWidth: 0,
                                    }}
                                    transition={{ duration: 0.22, ease: "easeOut" }}
                                    tabIndex={0}
                                    className={[
                                        "overflow-hidden rounded-2xl border bg-[#111827] p-5 outline-none transition",
                                        "focus-visible:ring-2 focus-visible:ring-blue-500/45",
                                        isHighlighted || isFocused
                                            ? "border-blue-400/50 ring-2 ring-blue-500/35"
                                            : "border-white/10",
                                    ].join(" ")}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-lg" aria-hidden>
                                                {priorityIcon(item.priority)}
                                            </span>
                                            <span
                                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityBadgeClass(item.priority)}`}
                                            >
                                                {priorityLabel(item.priority)}
                                            </span>
                                            <span className="inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-100">
                                                {t.announcementsNewBadge}
                                            </span>
                                        </div>
                                        <time className="text-xs text-slate-500">
                                            {formatSupportDate(item.created_at, language)}
                                        </time>
                                    </div>
                                    <h3 className="mt-3 text-base font-bold text-slate-50">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                                        {item.message}
                                    </p>
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            disabled={ackingId === item.id}
                                            onClick={() => void handleAcknowledge(item)}
                                            className={[
                                                "inline-flex items-center justify-center rounded-lg border border-white/10",
                                                "bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100",
                                                "transition hover:bg-white/10",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45",
                                                "disabled:cursor-wait disabled:opacity-60",
                                            ].join(" ")}
                                        >
                                            {ackingId === item.id ? (
                                                <Loader2
                                                    className="mr-2 h-4 w-4 animate-spin"
                                                    aria-hidden
                                                />
                                            ) : null}
                                            {t.announcementsGotIt}
                                        </button>
                                    </div>
                                </motion.article>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
