"use client"

import { useLanguage } from "@/context/LanguageProvider"
import type { StudentAnnouncementItem } from "@/lib/announcements"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

type PendingAnnouncementsCardProps = {
    announcements: StudentAnnouncementItem[]
    onReadNow: (announcement: StudentAnnouncementItem) => void
    onOpenAnnouncements: () => void
    onDismiss: (announcement: StudentAnnouncementItem) => Promise<void>
}

function formatRelativeTime(iso: string, locale: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""
    const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
    const abs = Math.abs(diffSec)
    const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es" : "en", { numeric: "auto" })
    if (abs < 60) return rtf.format(diffSec, "second")
    const diffMin = Math.round(diffSec / 60)
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
    const diffHour = Math.round(diffMin / 60)
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour")
    const diffDay = Math.round(diffHour / 24)
    if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day")
    const diffMonth = Math.round(diffDay / 30)
    return rtf.format(diffMonth, "month")
}

const focusBtn =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"

export default function PendingAnnouncementsCard({
    announcements,
    onReadNow,
    onOpenAnnouncements,
    onDismiss,
}: PendingAnnouncementsCardProps) {
    const { t, language } = useLanguage()
    const [dismissing, setDismissing] = useState(false)

    const newest = announcements[0]
    const count = announcements.length
    const isSingle = count === 1
    const moreCount = Math.max(0, count - 1)

    const handleDismiss = async () => {
        if (!newest || dismissing) return
        setDismissing(true)
        try {
            await onDismiss(newest)
        } finally {
            setDismissing(false)
        }
    }

    return (
        <AnimatePresence initial={false}>
            {newest ? (
                <motion.section
                    key={newest.id}
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
                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-sm sm:p-6"
                    aria-label={t.navAnnouncements}
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex items-start gap-3">
                            <span className="mt-0.5 text-xl leading-none" aria-hidden>
                                📢
                            </span>
                            <div className="min-w-0">
                                {isSingle ? (
                                    <>
                                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/50">
                                            {t.announcementsNewLabel}
                                        </p>
                                        <p className="mt-1 text-base font-extrabold leading-snug text-slate-50">
                                            {newest.title}
                                        </p>
                                        <p className="mt-1.5 text-xs text-white/45">
                                            {formatRelativeTime(newest.created_at, language)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-base font-extrabold leading-snug text-slate-50">
                                            {t.announcementsPendingMany.replace(
                                                "{count}",
                                                String(count)
                                            )}
                                        </p>
                                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/45">
                                            {t.announcementsLatestLabel}
                                        </p>
                                        <p className="mt-0.5 truncate text-sm text-slate-200">
                                            {newest.title}
                                        </p>
                                        {moreCount > 0 ? (
                                            <p className="mt-1.5 text-xs text-white/45">
                                                {t.announcementsMoreCount.replace(
                                                    "{count}",
                                                    String(moreCount)
                                                )}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:items-stretch sm:min-w-[10.5rem]">
                            <button
                                type="button"
                                onClick={() => {
                                    if (isSingle) onReadNow(newest)
                                    else onOpenAnnouncements()
                                }}
                                className={[
                                    "rounded-xl border border-white/10 bg-blue-600/20 px-4 py-2.5 text-sm font-extrabold text-blue-300 transition hover:bg-white/10",
                                    focusBtn,
                                ].join(" ")}
                            >
                                {isSingle ? t.announcementsReadNow : t.announcementsOpenCta}
                            </button>
                            <button
                                type="button"
                                disabled={dismissing}
                                onClick={() => void handleDismiss()}
                                className={[
                                    "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10",
                                    "disabled:cursor-wait disabled:opacity-60",
                                    focusBtn,
                                ].join(" ")}
                            >
                                {t.announcementsGotIt}
                            </button>
                        </div>
                    </div>
                </motion.section>
            ) : null}
        </AnimatePresence>
    )
}
