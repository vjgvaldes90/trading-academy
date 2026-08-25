"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useLanguage } from "@/context/LanguageProvider"

/** Purely decorative mock chart — no market data APIs. */
function HeroMarketVisual({ reduceMotion }: { reduceMotion: boolean }) {
    return (
        <div
            className={[
                "relative mx-auto w-full max-w-md lg:max-w-none",
                reduceMotion ? "" : "soa-hero-float",
            ].join(" ")}
            aria-hidden
        >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-transparent to-red-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0B1220]/80 shadow-[0_24px_60px_rgba(2,6,23,0.65)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-300">
                            SPX · Live
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            1D
                        </span>
                        <span className="rounded-md border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
                            1W
                        </span>
                    </div>
                </div>

                <div className="relative px-3 pb-3 pt-4 sm:px-4">
                    <div className="mb-3 flex items-end justify-between gap-3 px-1">
                        <div>
                            <p className="font-mono text-2xl font-bold tabular-nums text-slate-50 sm:text-3xl">
                                7,658.70
                            </p>
                            <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">
                                +32.18 · +0.42%
                            </p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                            <p>Vol 4.2B</p>
                            <p className="mt-0.5">RTH</p>
                        </div>
                    </div>

                    <svg
                        viewBox="0 0 360 160"
                        className="h-36 w-full sm:h-40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="soaHeroChartFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {[32, 64, 96, 128].map((y) => (
                            <line
                                key={y}
                                x1="0"
                                y1={y}
                                x2="360"
                                y2={y}
                                stroke="rgba(148,163,184,0.12)"
                                strokeWidth="1"
                            />
                        ))}
                        <path
                            d="M0 118 C28 112, 46 98, 72 102 C98 106, 118 78, 148 72 C178 66, 198 88, 224 58 C250 28, 278 42, 304 36 C322 32, 340 24, 360 28 L360 160 L0 160 Z"
                            fill="url(#soaHeroChartFill)"
                        />
                        <path
                            d="M0 118 C28 112, 46 98, 72 102 C98 106, 118 78, 148 72 C178 66, 198 88, 224 58 C250 28, 278 42, 304 36 C322 32, 340 24, 360 28"
                            stroke="rgb(96,165,250)"
                            strokeWidth="2.25"
                            strokeLinecap="round"
                        />
                        {/* Stylized candlesticks */}
                        <g opacity="0.85">
                            <line x1="40" y1="88" x2="40" y2="128" stroke="#64748b" strokeWidth="1" />
                            <rect x="35" y="96" width="10" height="24" rx="1" fill="#34d399" />
                            <line x1="88" y1="72" x2="88" y2="118" stroke="#64748b" strokeWidth="1" />
                            <rect x="83" y="78" width="10" height="28" rx="1" fill="#f87171" />
                            <line x1="136" y1="58" x2="136" y2="102" stroke="#64748b" strokeWidth="1" />
                            <rect x="131" y="64" width="10" height="26" rx="1" fill="#34d399" />
                            <line x1="184" y1="48" x2="184" y2="92" stroke="#64748b" strokeWidth="1" />
                            <rect x="179" y="54" width="10" height="22" rx="1" fill="#34d399" />
                            <line x1="232" y1="38" x2="232" y2="86" stroke="#64748b" strokeWidth="1" />
                            <rect x="227" y="46" width="10" height="28" rx="1" fill="#f87171" />
                            <line x1="280" y1="30" x2="280" y2="68" stroke="#64748b" strokeWidth="1" />
                            <rect x="275" y="34" width="10" height="22" rx="1" fill="#34d399" />
                        </g>
                    </svg>

                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-[10px]">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                            <p className="text-slate-500">Options</p>
                            <p className="mt-0.5 font-semibold text-slate-200">Calls · Puts</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                            <p className="text-slate-500">Equities</p>
                            <p className="mt-0.5 font-semibold text-slate-200">Stocks · ETFs</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                            <p className="text-slate-500">Format</p>
                            <p className="mt-0.5 font-semibold text-slate-200">Live sessions</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Hero() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const fadeUp = (delay: number) =>
        motionSafe
            ? {
                  initial: { opacity: 0, y: 24 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
              }
            : {
                  initial: { opacity: 1, y: 0 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0 },
              }

    return (
        <section className="relative flex min-h-[100svh] items-center overflow-hidden text-white">
            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
            >
                <source src="/video.mp4" type="video/mp4" />
            </video>

            {/* Depth overlays — financial, restrained */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#020617]/95 via-[#020617]/78 to-[#0B1120]/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(37,99,235,0.28),transparent_42%),radial-gradient(circle_at_86%_78%,rgba(220,38,38,0.14),transparent_46%)]" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                    backgroundImage:
                        "linear-gradient(to_right,rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)",
                    backgroundSize: "48px 48px",
                    maskImage:
                        "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
                }}
                aria-hidden
            />
            <div
                className={[
                    "pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl",
                    motionSafe ? "soa-hero-glow" : "",
                ].join(" ")}
                aria-hidden
            />

            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-28 md:px-8 md:pb-20 md:pt-32">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16">
                    <div className="text-center lg:text-left">
                        <motion.p
                            className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-500/10 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-200"
                            {...fadeUp(0)}
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden />
                            {t.smartOptionAcademy}
                        </motion.p>

                        <motion.h1
                            className="mb-5 text-4xl font-bold leading-[1.12] tracking-tight text-slate-50 sm:text-5xl md:text-6xl lg:text-[3.35rem] xl:text-6xl"
                            {...fadeUp(0.08)}
                        >
                            {t.heroTitle}
                        </motion.h1>

                        <motion.div
                            className="mx-auto mb-8 max-w-xl space-y-3 text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
                            {...fadeUp(0.16)}
                        >
                            <p>{t.heroSubtitle1}</p>
                            <p className="text-sm text-slate-400 sm:text-base">{t.heroSubtitle2}</p>
                        </motion.div>

                        <motion.div
                            className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
                            {...fadeUp(0.22)}
                        >
                            {[
                                t.heroChipOptions,
                                t.heroChipStocks,
                                t.heroChipEtfs,
                                t.heroChipLiveMentorship,
                            ].map((label) => (
                                <span
                                    key={label}
                                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-300"
                                >
                                    {label}
                                </span>
                            ))}
                        </motion.div>

                        <motion.div
                            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
                            {...fadeUp(0.28)}
                        >
                            <a
                                href="/login"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-base font-bold text-white shadow-[0_14px_36px_rgba(37,99,235,0.4)] transition duration-200 hover:scale-[1.02] hover:border-blue-200/40 hover:brightness-110 hover:shadow-[0_18px_44px_rgba(37,99,235,0.5)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:w-auto sm:text-lg"
                            >
                                {t.buyAccess}
                            </a>
                        </motion.div>

                        <motion.p
                            className="mt-5 text-sm text-slate-400"
                            {...fadeUp(0.34)}
                        >
                            {t.heroSocialProof}
                        </motion.p>
                    </div>

                    <motion.div
                        className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
                        {...fadeUp(0.2)}
                    >
                        <HeroMarketVisual reduceMotion={Boolean(reduceMotion)} />
                    </motion.div>
                </div>
            </div>

            <style jsx>{`
                @keyframes soaHeroFloat {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-8px);
                    }
                }
                @keyframes soaHeroGlow {
                    0%,
                    100% {
                        opacity: 0.45;
                    }
                    50% {
                        opacity: 0.75;
                    }
                }
                .soa-hero-float {
                    animation: soaHeroFloat 7s ease-in-out infinite;
                }
                .soa-hero-glow {
                    animation: soaHeroGlow 6s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .soa-hero-float,
                    .soa-hero-glow {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    )
}
