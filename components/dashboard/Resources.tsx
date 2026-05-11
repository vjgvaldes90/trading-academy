"use client"

import ResourcesSection from "@/components/dashboard/focused/ResourcesSection"

export default function Resources() {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">Recursos</h2>
                <p className="text-white/60 mt-1">Material complementario para tu aprendizaje.</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <ResourcesSection />
            </section>
        </div>
    )
}
