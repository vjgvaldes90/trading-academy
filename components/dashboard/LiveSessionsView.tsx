"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"
import PrivateClassSection from "@/components/dashboard/focused/PrivateClassSection"
import { useLanguage } from "@/context/LanguageProvider"

export default function LiveSessionsView() {
    const { t } = useLanguage()

    return (
        <div className="mx-auto max-w-7xl space-y-8 text-[#e5e7eb]">
            <header className="border-b border-white/10 pb-8">
                <h2 className="text-2xl font-bold tracking-tight text-slate-50 lg:text-[1.65rem]">
                    {t.liveSessionsTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                    {t.liveSessionsSubtitle}
                </p>
            </header>

            <BookSessionSection />

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-sm sm:p-6">
                <PrivateClassSection />
            </section>
        </div>
    )
}
