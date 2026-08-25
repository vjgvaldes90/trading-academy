"use client"

import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageProvider"

export default function ImportantDisclaimer() {
    const { t } = useLanguage()

    return (
        <section className="relative bg-[#020617] px-6 pb-8 pt-6 text-white sm:pb-10 sm:pt-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />

            <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/12 bg-[#0B1220]/85 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-8">
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(59,130,246,0.1),transparent_55%)]"
                    aria-hidden
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" aria-hidden />

                <div className="relative flex items-start gap-4">
                    <div className="shrink-0 rounded-xl border border-blue-300/25 bg-blue-500/10 p-2.5 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.12)]">
                        <ShieldCheck size={20} aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                            {t.importantDisclaimerTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                            {t.importantDisclaimerText}
                        </p>
                        <Link
                            href="/disclaimer"
                            className="mt-4 inline-flex rounded-lg border border-blue-300/25 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-200 transition duration-200 hover:border-blue-300/40 hover:bg-blue-500/25 hover:text-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                        >
                            {t.importantDisclaimerLink}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
