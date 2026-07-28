"use client"

import type { ActivityFeedItem } from "@/lib/activityFeed"
import { useLanguage } from "@/context/LanguageProvider"

function formatWhen(iso: string, locale: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
}

export default function RecentActivityPanel({
    items,
    loading,
}: {
    items: ActivityFeedItem[]
    loading: boolean
}) {
    const { t, language } = useLanguage()
    const locale = language === "es" ? "es" : "en"

    return (
        <section className="flex h-full min-h-[22rem] flex-col rounded-xl border border-white/10 bg-white/5">
            <header className="border-b border-white/10 px-5 py-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-200">
                    {t.adminRecentActivity}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{t.adminRecentActivitySubtitle}</p>
            </header>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="px-5 py-8 text-sm text-slate-400">{t.loading}</p>
                ) : items.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-400">{t.adminNoRecentActivity}</p>
                ) : (
                    <ul className="divide-y divide-white/5">
                        {items.map((item) => (
                            <li key={item.id} className="px-5 py-3.5">
                                <p className="text-sm font-medium text-slate-100">{item.title}</p>
                                {item.description ? (
                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                        {item.description}
                                    </p>
                                ) : null}
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {formatWhen(item.created_at, locale)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}
