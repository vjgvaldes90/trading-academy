"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"
import { useLanguage } from "@/context/LanguageProvider"

export default function LiveSessionsView() {
    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">{t.liveSessionsTitle}</h2>
                <p className="text-white/60 mt-1">{t.liveSessionsSubtitle}</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <BookSessionSection />
            </section>
        </div>
    )
}
