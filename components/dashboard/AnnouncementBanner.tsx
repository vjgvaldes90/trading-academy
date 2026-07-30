"use client"

import { useLanguage } from "@/context/LanguageProvider"
import type { StudentAnnouncementItem } from "@/lib/announcements"
import { useState } from "react"

type AnnouncementBannerProps = {
    announcement: StudentAnnouncementItem
    onReadNow: (announcement: StudentAnnouncementItem) => void
    onAcknowledge: (announcement: StudentAnnouncementItem) => Promise<void>
}

const focusBtn =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"

export default function AnnouncementBanner({
    announcement,
    onReadNow,
    onAcknowledge,
}: AnnouncementBannerProps) {
    const { t } = useLanguage()
    const [acking, setAcking] = useState(false)

    const handleGotIt = async () => {
        if (acking) return
        setAcking(true)
        try {
            await onAcknowledge(announcement)
        } finally {
            setAcking(false)
        }
    }

    return (
        <div
            role="status"
            className="rounded-2xl border border-red-400/35 bg-gradient-to-r from-red-950/80 to-red-900/40 px-4 py-4 shadow-[0_16px_40px_rgba(127,29,29,0.35)] sm:px-5"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-red-200/90">
                        🚨 {t.announcementsBannerImportant}
                    </p>
                    <h3 className="text-base font-bold text-white">{announcement.title}</h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-red-100/85">
                        {announcement.message}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:min-w-[9.5rem]">
                    <button
                        type="button"
                        onClick={() => onReadNow(announcement)}
                        className={[
                            "rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-50 transition hover:bg-red-500/30",
                            focusBtn,
                        ].join(" ")}
                    >
                        {t.announcementsReadNow}
                    </button>
                    <button
                        type="button"
                        disabled={acking}
                        onClick={() => void handleGotIt()}
                        className={[
                            "rounded-lg border border-red-300/25 bg-black/20 px-4 py-2 text-sm font-semibold text-red-50/90 transition hover:bg-black/30",
                            "disabled:cursor-wait disabled:opacity-60",
                            focusBtn,
                        ].join(" ")}
                    >
                        {t.announcementsGotIt}
                    </button>
                </div>
            </div>
        </div>
    )
}
