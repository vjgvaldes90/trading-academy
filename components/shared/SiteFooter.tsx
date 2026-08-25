"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageProvider"

export default function SiteFooter() {
    const { t } = useLanguage()

    return (
        <footer className="relative overflow-hidden border-t border-white/10 bg-[#020617] pb-[7.25rem] sm:pb-[5.25rem]">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.1),transparent_55%)]" />
                <div
                    className="absolute inset-0 opacity-[0.25]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                        maskImage:
                            "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
                        WebkitMaskImage:
                            "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
                    }}
                />
            </div>

            <div className="relative mx-auto w-full max-w-6xl px-6 py-10 sm:py-12">
                <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                    <div className="min-w-0 max-w-md">
                        <p className="text-sm font-bold tracking-wide text-blue-300 sm:text-[15px]">
                            {t.smartOptionAcademy}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                            {t.footerCopyright}
                        </p>
                    </div>

                    <nav aria-label="Legal" className="shrink-0">
                        <Link
                            href="/disclaimer"
                            className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-blue-300 transition duration-200 hover:border-blue-300/30 hover:bg-blue-500/10 hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                        >
                            {t.footerDisclaimer}
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    )
}
