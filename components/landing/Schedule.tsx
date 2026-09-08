"use client"

import { motion, useReducedMotion } from "framer-motion"
import { BookOpen, CalendarDays, Clock, GraduationCap, LineChart, Target, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

/** Decorative mini chart — no market data. */
function ScheduleDecorChart({ reduceMotion }: { reduceMotion: boolean }) {
    return (
        <div
            className={[
                "pointer-events-none absolute -right-2 top-6 hidden w-28 opacity-40 sm:block lg:w-32",
                reduceMotion ? "" : "soa-schedule-float",
            ].join(" ")}
            aria-hidden
        >
            <svg viewBox="0 0 120 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full">
                <path
                    d="M0 40 C18 38, 28 28, 42 30 C56 32, 64 18, 78 16 C92 14, 104 22, 120 12"
                    stroke="rgb(96,165,250)"
                    strokeWidth="1.5"
                    strokeOpacity="0.7"
                />
                <path
                    d="M0 40 C18 38, 28 28, 42 30 C56 32, 64 18, 78 16 C92 14, 104 22, 120 12 L120 56 L0 56 Z"
                    fill="rgb(59,130,246)"
                    fillOpacity="0.12"
                />
                {[18, 36, 54, 72, 90].map((x, i) => (
                    <rect
                        key={x}
                        x={x}
                        y={i % 2 === 0 ? 22 : 28}
                        width="4"
                        height={i % 2 === 0 ? 18 : 12}
                        rx="1"
                        fill={i % 2 === 0 ? "rgb(52,211,153)" : "rgb(248,113,113)"}
                        fillOpacity="0.45"
                    />
                ))}
            </svg>
        </div>
    )
}

const cardShell =
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0B1220]/88 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-7 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/40 before:to-transparent"

export default function Schedule() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const tradingDays = [
        { day: t.scheduleMonday, time: t.scheduleTradingTimeRange },
        { day: t.scheduleTuesday, time: t.scheduleTradingTimeRange },
        { day: t.scheduleWednesday, time: t.scheduleTradingTimeRange },
    ]

    const sectionReveal = motionSafe
        ? {
              initial: { opacity: 0, y: 36 },
              whileInView: { opacity: 1, y: 0 },
              transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
              viewport: { once: true, margin: "-60px" },
          }
        : {
              initial: { opacity: 1, y: 0 },
              whileInView: { opacity: 1, y: 0 },
              transition: { duration: 0 },
              viewport: { once: true },
          }

    const cardMotion = (i: number) =>
        motionSafe
            ? {
                  initial: { opacity: 0, y: 20 },
                  whileInView: { opacity: 1, y: 0 },
                  transition: {
                      duration: 0.45,
                      delay: 0.08 * i,
                      ease: [0.22, 1, 0.36, 1] as const,
                  },
                  viewport: { once: true, margin: "-40px" as const },
              }
            : {
                  initial: { opacity: 1, y: 0 },
                  whileInView: { opacity: 1, y: 0 },
                  transition: { duration: 0 },
                  viewport: { once: true },
              }

    return (
        <section className="relative overflow-hidden bg-[#020617] py-24 text-white sm:py-28">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.14),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(220,38,38,0.06),transparent_45%)]" />
                <div
                    className="absolute inset-0 opacity-[0.32]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)",
                        backgroundSize: "56px 56px",
                        maskImage: "radial-gradient(ellipse at center, black 18%, transparent 72%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 18%, transparent 72%)",
                    }}
                />
            </div>

            <motion.div
                className="relative mx-auto max-w-6xl px-6 text-center sm:px-8"
                {...sectionReveal}
            >
                <ScheduleDecorChart reduceMotion={!motionSafe} />

                <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-1.5">
                    <span className="relative flex h-2 w-2" aria-hidden>
                        <span
                            className={[
                                "absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60",
                                motionSafe ? "soa-live-ping" : "",
                            ].join(" ")}
                        />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200/95">
                        {t.scheduleEyebrow}
                    </span>
                </div>

                <h2 className="mb-4 text-balance text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                    {t.scheduleTitle}
                </h2>

                <p className="mx-auto mb-12 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:mb-14 sm:text-lg">
                    {t.scheduleSubtitle}
                </p>

                <div className="mx-auto grid max-w-6xl gap-5 text-left sm:gap-6 lg:grid-cols-3">
                    {/* Trading — primary recurring schedule */}
                    <motion.article
                        className={[
                            cardShell,
                            motionSafe
                                ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                : "",
                        ].join(" ")}
                        {...cardMotion(0)}
                    >
                        <div
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.12),transparent_55%)]"
                            aria-hidden
                        />
                        <div className="relative mb-4 flex items-center gap-2.5 text-blue-300">
                            <CalendarDays className="h-5 w-5 shrink-0" aria-hidden />
                            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
                                {t.scheduleTradingCardTitle}
                            </h3>
                        </div>
                        <p className="relative mb-5 text-sm leading-relaxed text-slate-400">
                            {t.scheduleTradingCardBlurb}
                        </p>
                        <ul className="relative space-y-3">
                            {tradingDays.map((row) => (
                                <li
                                    key={row.day}
                                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
                                >
                                    <p className="text-sm font-semibold text-slate-100">{row.day}</p>
                                    <p className="mt-1 flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-slate-300 sm:text-sm">
                                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                                        {row.time}
                                    </p>
                                </li>
                            ))}
                        </ul>
                        <p className="relative mt-4 text-xs leading-relaxed text-slate-500">
                            {t.scheduleSessionTitle}
                        </p>
                    </motion.article>

                    {/* Theory — Full Program only; no invented day/time */}
                    <motion.article
                        className={[
                            cardShell,
                            motionSafe
                                ? "transition duration-300 hover:-translate-y-1 hover:border-violet-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                : "",
                        ].join(" ")}
                        {...cardMotion(1)}
                    >
                        <div
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_55%)]"
                            aria-hidden
                        />
                        <div className="relative mb-4 flex items-center gap-2.5 text-violet-300">
                            <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
                            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
                                {t.scheduleTheoryCardTitle}
                            </h3>
                        </div>
                        <p className="relative mb-5 text-sm leading-relaxed text-slate-400">
                            {t.scheduleTheoryWeekly}
                        </p>
                        <ul className="relative mb-5 space-y-2.5" aria-label={t.scheduleTheoryCardTitle}>
                            {(
                                [
                                    { icon: GraduationCap, label: t.scheduleTheoryFocus1 },
                                    { icon: LineChart, label: t.scheduleTheoryFocus2 },
                                    { icon: Target, label: t.scheduleTheoryFocus3 },
                                ] as const
                            ).map(({ icon: Icon, label }) => (
                                <li
                                    key={label}
                                    className="flex items-center gap-2.5 rounded-lg border border-violet-400/15 bg-white/[0.03] px-3 py-2"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-300">
                                        <Icon className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <span className="text-xs font-medium leading-snug text-slate-300 sm:text-[13px]">
                                        {label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <div className="relative mt-auto rounded-xl border border-violet-400/25 bg-violet-500/10 px-3.5 py-3">
                            <p className="text-sm font-semibold text-violet-100">
                                {t.scheduleTheoryPlanNote}
                            </p>
                            <p className="mt-1 text-xs text-violet-200/80">{t.pricingFullProgramName}</p>
                        </div>
                    </motion.article>

                    {/* Private 1:1 — marketing only */}
                    <motion.article
                        className={[
                            cardShell,
                            motionSafe
                                ? "transition duration-300 hover:-translate-y-1 hover:border-amber-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                : "",
                        ].join(" ")}
                        {...cardMotion(2)}
                    >
                        <div
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.1),transparent_55%)]"
                            aria-hidden
                        />
                        <div className="relative mb-4 flex items-center gap-2.5 text-amber-300">
                            <UserRound className="h-5 w-5 shrink-0" aria-hidden />
                            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
                                {t.schedulePrivateCardTitle}
                            </h3>
                        </div>
                        <p className="relative mb-5 text-sm leading-relaxed text-slate-400">
                            {t.schedulePrivateCardBlurb}
                        </p>
                        <div className="relative space-y-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {t.privateClassDurationDisplay}
                                </p>
                                <p className="mt-1 text-2xl font-extrabold text-amber-300">
                                    {t.privateClassPriceDisplay}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-3">
                                <p className="text-sm font-semibold text-amber-100">
                                    {t.schedulePrivateByRequest}
                                </p>
                            </div>
                        </div>
                    </motion.article>
                </div>

                <a
                    href="/login"
                    className={[
                        "mt-12 inline-block rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-base font-bold text-white sm:mt-14 sm:text-lg",
                        "shadow-[0_14px_36px_rgba(37,99,235,0.4)]",
                        "transition duration-200",
                        "hover:scale-[1.02] hover:border-blue-200/40 hover:brightness-110 hover:shadow-[0_18px_44px_rgba(37,99,235,0.5)]",
                        "active:scale-[0.99]",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                    ].join(" ")}
                >
                    {t.buyAccess}
                </a>

                <p className="mt-5 text-xs text-slate-500 sm:mt-6 sm:text-sm">{t.scheduleFootnote}</p>
            </motion.div>

            <style jsx>{`
                @keyframes soaLivePing {
                    0% {
                        transform: scale(1);
                        opacity: 0.6;
                    }
                    75%,
                    100% {
                        transform: scale(2.2);
                        opacity: 0;
                    }
                }
                @keyframes soaScheduleFloat {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-6px);
                    }
                }
                .soa-live-ping {
                    animation: soaLivePing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                .soa-schedule-float {
                    animation: soaScheduleFloat 6s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .soa-live-ping,
                    .soa-schedule-float {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    )
}
