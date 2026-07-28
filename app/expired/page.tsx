"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageProvider"

export default function ExpiredAccessPage() {
    const { t } = useLanguage()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {t.expiredEyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{t.expiredTitle}</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                {t.expiredText}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#020617] transition hover:bg-emerald-400"
                >
                    {t.expiredRenew}
                </Link>
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/60"
                >
                    {t.expiredGoToLogin}
                </Link>
            </div>
        </div>
    )
}
