"use client"

import type { ExecutiveUpcomingSession } from "@/lib/executiveDashboard"
import { useLanguage } from "@/context/LanguageProvider"

function formatDate(date: string | null, locale: string): string {
    if (!date) return "—"
    const d = new Date(`${date}T12:00:00`)
    if (Number.isNaN(d.getTime())) return date
    return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })
}

function seatStatusLabel(
    status: ExecutiveUpcomingSession["seatStatus"],
    t: { adminSeatAvailable: string; adminSeatFull: string; adminSeatUnknown: string }
): string {
    if (status === "full") return t.adminSeatFull
    if (status === "available") return t.adminSeatAvailable
    return t.adminSeatUnknown
}

export default function UpcomingLiveSessionsPanel({
    sessions,
    loading,
}: {
    sessions: ExecutiveUpcomingSession[]
    loading: boolean
}) {
    const { t, language } = useLanguage()
    const locale = language === "es" ? "es" : "en"

    return (
        <section className="flex h-full min-h-[22rem] flex-col rounded-xl border border-white/10 bg-white/5">
            <header className="border-b border-white/10 px-5 py-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-200">
                    {t.adminUpcomingLiveSessions}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{t.adminUpcomingLiveSessionsSubtitle}</p>
            </header>
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                {loading ? (
                    <p className="px-5 py-8 text-sm text-slate-400">{t.loading}</p>
                ) : sessions.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-400">{t.adminNoUpcomingSessions}</p>
                ) : (
                    <table className="w-full min-w-[28rem] text-left text-sm">
                        <thead className="sticky top-0 bg-[#0F172A]/95 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold">{t.dateLabel}</th>
                                <th className="px-4 py-3 font-semibold">{t.timeLabel}</th>
                                <th className="px-4 py-3 font-semibold">{t.adminCapacity}</th>
                                <th className="px-4 py-3 font-semibold">{t.adminBookedSeats}</th>
                                <th className="px-4 py-3 font-semibold">{t.statusLabel}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sessions.map((s) => (
                                <tr key={s.id} className="text-slate-200">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {formatDate(s.date, locale)}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                                        {s.time ?? "—"}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums text-slate-400">
                                        {s.capacity == null ? "—" : s.capacity}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums text-slate-400">
                                        {s.bookedSeats == null ? "—" : s.bookedSeats}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={[
                                                "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                                                s.seatStatus === "full"
                                                    ? "bg-rose-500/15 text-rose-300"
                                                    : s.seatStatus === "available"
                                                      ? "bg-emerald-500/15 text-emerald-300"
                                                      : "bg-white/5 text-slate-400",
                                            ].join(" ")}
                                        >
                                            {seatStatusLabel(s.seatStatus, t)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    )
}
