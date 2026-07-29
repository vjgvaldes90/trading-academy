"use client"

import { useLanguage } from "@/context/LanguageProvider"
import type { StudentAnnouncementItem } from "@/lib/announcements"

type AnnouncementBannerProps = {
    announcement: StudentAnnouncementItem
    onView: (announcement: StudentAnnouncementItem) => void
}

export default function AnnouncementBanner({ announcement, onView }: AnnouncementBannerProps) {
    const { t } = useLanguage()

    return (
        <div
            role="status"
            className="rounded-2xl border border-red-400/35 bg-gradient-to-r from-red-950/80 to-red-900/40 px-4 py-4 shadow-[0_16px_40px_rgba(127,29,29,0.35)] sm:px-5"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-red-200/90">
                        🚨 {t.announcementsPriorityCritical}
                    </p>
                    <h3 className="text-base font-bold text-white">{announcement.title}</h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-red-100/85">
                        {announcement.message}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onView(announcement)}
                    className="shrink-0 rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-50 transition hover:bg-red-500/30"
                >
                    {t.announcementsBannerView}
                </button>
            </div>
        </div>
    )
}
