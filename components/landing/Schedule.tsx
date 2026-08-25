"use client"

import { motion, useReducedMotion } from "framer-motion"
import { CalendarDays, Clock } from "lucide-react"
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

export default function Schedule() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const sessions = [
        { day: t.scheduleMonday, title: t.scheduleSessionTitle, time: t.scheduleSessionTime },
        { day: t.scheduleTuesday, title: t.scheduleSessionTitle, time: t.scheduleSessionTime },
        { day: t.scheduleWednesday, title: t.scheduleSessionTitle, time: t.scheduleSessionTime },
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
                        maskImage:
                            "radial-gradient(ellipse at center, black 18%, transparent 72%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 18%, transparent 72%)",
                    }}
                />
            </div>

            <motion.div
                className="relative mx-auto max-w-5xl px-6 text-center sm:px-8"
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

                <ol className="relative mx-auto grid max-w-4xl gap-5 text-left sm:gap-6 md:grid-cols-3">
                    {/* Decorative timeline connector — desktop */}
                    <div
                        className="pointer-events-none absolute left-[8%] right-[8%] top-[2.35rem] hidden h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent md:block"
                        aria-hidden
                    />

                    {sessions.map((s, i) => (
                        <motion.li
                            key={`${s.day}-${s.time}`}
                            className="relative list-none"
                            initial={motionSafe ? { opacity: 0, y: 20 } : false}
                            whileInView={motionSafe ? { opacity: 1, y: 0 } : undefined}
                            transition={
                                motionSafe
                                    ? {
                                          duration: 0.45,
                                          delay: 0.08 * i,
                                          ease: [0.22, 1, 0.36, 1],
                                      }
                                    : { duration: 0 }
                            }
                            viewport={{ once: true, margin: "-40px" }}
                        >
                            <article
                                className={[
                                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0B1220]/88 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-7",
                                    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/40 before:to-transparent",
                                    motionSafe
                                        ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                        : "",
                                ].join(" ")}
                            >
                                <div
                                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.1),transparent_55%)]"
                                    aria-hidden
                                />

                                {/* Timeline node */}
                                <div className="relative mb-5 flex justify-center md:mb-6">
                                    <span className="flex h-3 w-3 items-center justify-center rounded-full border border-blue-300/50 bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.55)] ring-4 ring-[#020617]" />
                                </div>

                                <div className="relative mb-4 flex items-center gap-2 text-blue-300">
                                    <CalendarDays
                                        className={[
                                            "h-4 w-4 shrink-0",
                                            motionSafe
                                                ? "transition duration-300 group-hover:text-blue-200"
                                                : "",
                                        ].join(" ")}
                                        aria-hidden
                                    />
                                    <h3 className="text-lg font-bold tracking-tight sm:text-xl">
                                        {s.day}
                                    </h3>
                                </div>

                                <p className="relative mb-5 text-[15px] leading-relaxed text-slate-300 sm:text-base">
                                    {s.title}
                                </p>

                                <div className="relative mt-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                    <p className="font-mono text-sm font-semibold tabular-nums text-slate-200">
                                        {s.time}
                                    </p>
                                </div>
                            </article>
                        </motion.li>
                    ))}
                </ol>

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

                <p className="mt-5 text-xs text-slate-500 sm:mt-6 sm:text-sm">
                    {t.scheduleFootnote}
                </p>
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
