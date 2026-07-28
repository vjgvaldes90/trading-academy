"use client"

import { BarChart3, LineChart, PieChart } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"
import { useMemo } from "react"

export default function AdminAnalytics() {
    const { t } = useLanguage()

    const cards = useMemo(
        () => [
            { Icon: BarChart3, title: t.adminAnalyticsSessionFill, hint: t.comingSoon },
            { Icon: LineChart, title: t.adminAnalyticsActiveLearners, hint: t.comingSoon },
            { Icon: PieChart, title: t.adminAnalyticsPlanMix, hint: t.comingSoon },
        ],
        [t]
    )

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">{t.adminAnalytics}</h2>
                <p className="mt-1 text-sm text-slate-400">{t.adminAnalyticsSubtitle}</p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {cards.map(({ Icon, title, hint }) => (
                    <div
                        key={title}
                        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-6"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-blue-500/10 text-blue-300">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-extrabold text-slate-100">{title}</p>
                            <p className="mt-1 text-sm text-slate-500">{hint}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
