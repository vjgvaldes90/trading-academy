"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { ArrowLeft } from "lucide-react"

export default function BackToDashboardButton({
    onBack,
}: {
    onBack: () => void
}) {
    const { t } = useLanguage()

    return (
        <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
        >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t.dashboardBackToDashboard}
        </button>
    )
}
