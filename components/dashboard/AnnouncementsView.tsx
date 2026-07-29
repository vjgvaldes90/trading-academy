"use client"

import { formatSupportDate } from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import type { StudentAnnouncementItem } from "@/lib/announcements"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"

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
    onOpenAnnouncement: (announcement: StudentAnnouncementItem) => void
}

export default function AnnouncementsView({
    announcements,
    loading,
    error,
    focusAnnouncementId = null,
    onRetry,
    onOpenAnnouncement,
}: AnnouncementsViewProps) {
    const { t, language } = useLanguage()
    const openedFocusRef = useRef<string | null>(null)
    const cardRefs = useRef<Record<string, HTMLElement | null>>({})

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
        const target = announcements.find((a) => a.id === focusAnnouncementId)
        if (target && openedFocusRef.current !== focusAnnouncementId) {
            openedFocusRef.current = focusAnnouncementId
            onOpenAnnouncement(target)
        }
    }, [focusAnnouncementId, announcements, onOpenAnnouncement])

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
                        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    >
                        {t.announcementsRetry}
                    </button>
                </div>
            ) : announcements.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-16 text-center text-sm text-slate-400">
                    {t.announcementsEmpty}
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((item) => (
                        <article
                            key={item.id}
                            id={`announcement-${item.id}`}
                            ref={(node) => {
                                cardRefs.current[item.id] = node
                            }}
                            tabIndex={0}
                            onClick={() => onOpenAnnouncement(item)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    onOpenAnnouncement(item)
                                }
                            }}
                            className={[
                                "cursor-pointer rounded-2xl border bg-[#111827] p-5 transition",
                                item.read
                                    ? "border-white/10 hover:border-white/20"
                                    : "border-blue-500/30 hover:border-blue-400/50",
                                focusAnnouncementId === item.id ? "ring-2 ring-blue-500/40" : "",
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
                                    {!item.read ? (
                                        <span className="inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-100">
                                            {t.announcementsNewBadge}
                                        </span>
                                    ) : null}
                                </div>
                                <time className="text-xs text-slate-500">
                                    {formatSupportDate(item.created_at, language)}
                                </time>
                            </div>
                            <h3 className="mt-3 text-base font-bold text-slate-50">{item.title}</h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                                {item.message}
                            </p>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}
