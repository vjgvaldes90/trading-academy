"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageProvider"

export default function BlockedPage() {
    const { t } = useLanguage()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.blockedEyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{t.blockedTitle}</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                {t.blockedText}
            </p>
            <div className="mt-10">
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/60"
                >
                    {t.blockedBackToLogin}
                </Link>
            </div>
        </div>
    )
}
