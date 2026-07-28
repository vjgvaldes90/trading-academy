"use client"

import ResourcesSection from "@/components/dashboard/focused/ResourcesSection"
import { useLanguage } from "@/context/LanguageProvider"

export default function Resources() {
    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">{t.resourcesTitle}</h2>
                <p className="text-white/60 mt-1">{t.resourcesSubtitle}</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <ResourcesSection />
            </section>
        </div>
    )
}
