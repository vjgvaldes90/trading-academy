"use client"

import { useLanguage } from "@/context/LanguageProvider"

/** Final chart shell — revenue aggregation is not wired yet. */
export default function MonthlyRevenueChart() {
    const { t } = useLanguage()

    return (
        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <header className="mb-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-200">
                    {t.adminMonthlyRevenueChart}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{t.adminMonthlyRevenueChartSubtitle}</p>
            </header>

            <div className="relative flex h-48 flex-col justify-end">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="rounded-lg border border-dashed border-white/15 bg-[#0B1120]/70 px-3 py-2 text-xs text-slate-400">
                        {t.adminRevenuePlaceholder}
                    </p>
                </div>
                <svg
                    viewBox="0 0 320 140"
                    className="h-36 w-full opacity-35"
                    aria-hidden
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="execRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0 110 C40 100, 60 70, 100 75 C140 80, 160 40, 200 50 C240 60, 260 30, 320 35 L320 140 L0 140 Z"
                        fill="url(#execRevenueFill)"
                    />
                    <path
                        d="M0 110 C40 100, 60 70, 100 75 C140 80, 160 40, 200 50 C240 60, 260 30, 320 35"
                        fill="none"
                        stroke="rgb(96,165,250)"
                        strokeWidth="2.5"
                    />
                </svg>
                <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                </div>
            </div>
        </section>
    )
}
