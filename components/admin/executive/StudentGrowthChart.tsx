"use client"

import type { StudentGrowthPoint } from "@/lib/executiveDashboard"
import { useLanguage } from "@/context/LanguageProvider"

export default function StudentGrowthChart({
    points,
    loading,
}: {
    points: StudentGrowthPoint[]
    loading: boolean
}) {
    const { t } = useLanguage()
    const max = Math.max(1, ...points.map((p) => p.count))
    const hasData = points.some((p) => p.count > 0)

    return (
        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <header className="mb-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-200">
                    {t.adminStudentGrowth}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{t.adminStudentGrowthSubtitle}</p>
            </header>

            {loading ? (
                <p className="py-10 text-sm text-slate-400">{t.loading}</p>
            ) : !hasData ? (
                <div className="relative flex h-48 flex-col justify-end gap-2">
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <p className="rounded-lg border border-dashed border-white/15 bg-[#0B1120]/70 px-3 py-2 text-xs text-slate-400">
                            {t.adminChartNotEnoughData}
                        </p>
                    </div>
                    <div className="flex h-36 items-end gap-2 opacity-30">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex flex-1 flex-col items-center gap-2">
                                <div
                                    className="w-full rounded-t-md bg-blue-500/40"
                                    style={{ height: `${20 + ((i * 17) % 60)}%` }}
                                />
                                <span className="h-3 w-8 rounded bg-white/10" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex h-48 items-end gap-2 sm:gap-3">
                    {points.map((p) => {
                        const heightPct = Math.max(6, Math.round((p.count / max) * 100))
                        return (
                            <div key={p.monthKey} className="flex flex-1 flex-col items-center gap-2">
                                <span className="text-[11px] tabular-nums text-slate-400">{p.count}</span>
                                <div className="flex h-36 w-full items-end">
                                    <div
                                        className="w-full rounded-t-md bg-gradient-to-t from-blue-600/80 to-blue-400/70"
                                        style={{ height: `${heightPct}%` }}
                                        title={`${p.label}: ${p.count}`}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500 sm:text-[11px]">{p.label}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
