"use client"

import { GraduationCap, LineChart } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

type ClassStartAnnouncementProps = {
    className?: string
    /** When true, show a secondary "View programs" link under the cards. */
    showViewProgramsCta?: boolean
}

/**
 * Compact live-class start dates for the Hero.
 * Desktop: sits under the market simulator (right column).
 * Mobile: sits in the content stack before the primary CTA.
 */
export default function ClassStartAnnouncement({
    className = "",
    showViewProgramsCta = false,
}: ClassStartAnnouncementProps) {
    const { t } = useLanguage()

    const cardBase =
        "relative flex min-w-0 flex-col gap-1 rounded-xl border border-white/12 bg-[#0B1220]/75 px-3.5 py-3 shadow-[0_12px_28px_rgba(2,6,23,0.45)] backdrop-blur-md sm:px-4 sm:py-3.5"

    return (
        <div
            className={["w-full min-w-0", className].filter(Boolean).join(" ")}
            aria-label={t.classStartTitle}
        >
            <div className="mb-3 flex flex-col items-center gap-1.5 text-center sm:mb-3.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1">
                    <span className="relative flex h-1.5 w-1.5" aria-hidden>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/95">
                        {t.classStartEyebrow}
                    </span>
                </span>
                <p className="max-w-sm text-balance text-xs font-semibold text-slate-200 sm:text-sm">
                    {t.classStartTitle}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 sm:gap-3">
                <article className={[cardBase, "border-violet-300/20"].join(" ")}>
                    <div
                        className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_20%_0%,rgba(139,92,246,0.12),transparent_60%)]"
                        aria-hidden
                    />
                    <div className="relative flex items-center gap-1.5 text-violet-300">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <h3 className="min-w-0 text-[11px] font-bold uppercase tracking-[0.06em] sm:text-xs">
                            {t.classStartFullProgramName}
                        </h3>
                    </div>
                    <p
                        className="relative font-mono text-xl font-extrabold tracking-tight text-white sm:text-2xl"
                        aria-hidden
                    >
                        {t.classStartFullProgramBadge}
                    </p>
                    <p className="relative text-xs font-medium text-slate-200 sm:text-[13px]">
                        {t.classStartFullProgramDate}
                    </p>
                    <p className="relative text-[11px] leading-snug text-slate-400 sm:text-xs">
                        {t.classStartFullProgramFocus}
                    </p>
                </article>

                <article className={[cardBase, "border-blue-300/20"].join(" ")}>
                    <div
                        className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_20%_0%,rgba(59,130,246,0.12),transparent_60%)]"
                        aria-hidden
                    />
                    <div className="relative flex items-center gap-1.5 text-blue-300">
                        <LineChart className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <h3 className="min-w-0 text-[11px] font-bold uppercase tracking-[0.06em] sm:text-xs">
                            {t.classStartTradingProgramName}
                        </h3>
                    </div>
                    <p
                        className="relative font-mono text-xl font-extrabold tracking-tight text-white sm:text-2xl"
                        aria-hidden
                    >
                        {t.classStartTradingProgramBadge}
                    </p>
                    <p className="relative text-xs font-medium text-slate-200 sm:text-[13px]">
                        {t.classStartTradingProgramDate}
                    </p>
                    <p className="relative text-[11px] leading-snug text-slate-400 sm:text-xs">
                        {t.classStartTradingProgramFocus}
                    </p>
                </article>
            </div>

            {showViewProgramsCta ? (
                <div className="mt-3 flex justify-center sm:mt-3.5">
                    <a
                        href="#pricing"
                        className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition duration-200 hover:border-blue-300/35 hover:bg-blue-500/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-sm"
                    >
                        {t.classStartViewPrograms}
                    </a>
                </div>
            ) : null}
        </div>
    )
}
