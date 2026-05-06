"use client"

import { motion } from "framer-motion"

export default function ChartSection() {
    return (
        <motion.section
            className="bg-black py-14 text-white md:py-16"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="mx-auto max-w-6xl px-8 text-center">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-400 md:text-base">
                    Live Market Analysis
                </p>

                <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
                    Stocks • Options • ETFs
                </h2>

                <p className="mx-auto mb-7 max-w-xl text-base text-slate-300 md:text-lg">
                    Accede a análisis de mercado en tiempo real y aprende estrategias profesionales junto a expertos.
                </p>

                <motion.div
                    className="group relative overflow-hidden rounded-3xl border border-white/15 shadow-[0_35px_90px_rgba(0,0,0,0.65)]"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <div className="pointer-events-none absolute inset-0 rounded-3xl border border-red-500/25 shadow-[0_0_36px_rgba(239,68,68,0.18)] transition-all duration-500 group-hover:shadow-[0_0_48px_rgba(239,68,68,0.3)]" />
                    <div className="pointer-events-none absolute inset-0 rounded-3xl border border-sky-400/15 opacity-60 blur-[1px] transition-all duration-500 group-hover:opacity-90" />
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-45"
                        style={{ backgroundImage: "url('/images/trading-preview-poster.jpg')" }}
                    />

                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        poster="/images/trading-preview-poster.jpg"
                        className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-[1.04]"
                    >
                        <source src="/videos/trading-class-preview.mp4" type="video/mp4" />
                    </video>

                    <div className="h-[250px] w-full md:h-[370px]" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/86 via-black/42 to-black/64" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(239,68,68,0.24),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(37,99,235,0.15),transparent_42%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
                    <div className="pointer-events-none absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,transparent_0,transparent_38px,rgba(15,23,42,0.38)_39px,transparent_40px)]" />
                    <div className="pointer-events-none absolute inset-y-0 left-1/4 w-px animate-[marketScan_4s_linear_infinite] bg-gradient-to-b from-transparent via-sky-400/70 to-transparent blur-[1px]" />
                    <div className="pointer-events-none absolute inset-x-0 top-[42%] h-px animate-[marketPulse_3.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-red-300/60 to-transparent" />
                    <div className="pointer-events-none absolute bottom-8 left-0 right-0 hidden px-6 md:block">
                        <svg
                            viewBox="0 0 800 180"
                            className="h-24 w-full opacity-55"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M0 145 L45 132 L85 136 L130 98 L180 110 L220 78 L265 90 L312 64 L360 75 L405 42 L455 56 L500 38 L548 50 L592 26 L636 41 L682 24 L730 34 L800 20"
                                fill="none"
                                stroke="rgba(56,189,248,0.9)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M0 160 L35 155 L76 146 L122 142 L166 126 L210 120 L258 115 L304 102 L352 108 L398 94 L446 96 L492 81 L540 87 L588 72 L634 79 L682 68 L730 75 L800 60"
                                fill="none"
                                stroke="rgba(239,68,68,0.82)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className="pointer-events-none absolute bottom-6 left-6 hidden opacity-80 md:block">
                        <svg viewBox="0 0 220 70" className="h-16 w-[220px]" aria-hidden="true">
                            {[18, 42, 30, 50, 35, 46, 24, 39, 29, 44].map((y, idx) => {
                                const x = 8 + idx * 20
                                const up = idx % 2 === 0
                                const bodyH = up ? 14 : 11
                                const bodyY = up ? y - bodyH : y
                                return (
                                    <g key={x}>
                                        <line
                                            x1={x + 4}
                                            y1={Math.max(4, y - 14)}
                                            x2={x + 4}
                                            y2={Math.min(66, y + 18)}
                                            stroke={up ? "rgba(74,222,128,0.88)" : "rgba(248,113,113,0.88)"}
                                            strokeWidth="1.5"
                                        />
                                        <rect
                                            x={x}
                                            y={bodyY}
                                            width="8"
                                            height={bodyH}
                                            rx="1.6"
                                            fill={up ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)"}
                                        />
                                    </g>
                                )
                            })}
                        </svg>
                    </div>

                    <div className="pointer-events-none absolute left-4 top-14 hidden rounded-2xl border border-white/15 bg-white/10 p-2.5 text-left backdrop-blur-xl md:block">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            LIVE MARKET ANALYSIS
                        </p>
                        <div className="mt-1.5 space-y-1 text-xs">
                            <p className="flex items-center justify-between gap-6">
                                <span className="text-slate-300">NASDAQ</span>
                                <span className="font-semibold text-emerald-300">+0.8%</span>
                            </p>
                            <p className="flex items-center justify-between gap-6">
                                <span className="text-slate-300">EUR/USD</span>
                                <span className="font-semibold text-red-300">-0.2%</span>
                            </p>
                            <p className="flex items-center justify-between gap-6">
                                <span className="text-slate-300">DXY</span>
                                <span className="font-semibold text-amber-200">101.42</span>
                            </p>
                        </div>
                    </div>

                    <div className="pointer-events-none absolute right-4 top-14 hidden rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-xs text-slate-100 backdrop-blur-xl md:flex md:items-center md:gap-2">
                        <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5">Forex</span>
                        <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5">Futuros</span>
                        <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5">NASDAQ</span>
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/45 px-4 py-1.5 text-[10px] font-medium tracking-[0.08em] text-slate-200/85 backdrop-blur-md sm:text-xs">
                        <div className="ticker-track flex items-center gap-8 whitespace-nowrap">
                            <span>EUR/USD 1.0871</span>
                            <span>NASDAQ +0.82%</span>
                            <span>SP500 +0.41%</span>
                            <span>GOLD 2331.20</span>
                            <span>WTI 81.64</span>
                            <span>DXY 101.42</span>
                        </div>
                    </div>

                    <div className="absolute inset-0 flex flex-col justify-between p-4 text-left sm:p-5 md:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/45 bg-red-500/15 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-red-100 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.95)]" />
                                EN VIVO
                            </span>
                            <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 backdrop-blur-xl">
                                500+ Traders
                            </span>
                        </div>

                        <div className="flex items-end justify-end gap-3">
                            <a
                                href="/login"
                                className="pointer-events-auto inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(220,38,38,0.4)] transition-all duration-300 hover:brightness-110 sm:px-5"
                            >
                                Ver Clase
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>
            <style jsx>{`
                @keyframes marketScan {
                    0% {
                        transform: translateX(-140px);
                        opacity: 0;
                    }
                    20% {
                        opacity: 0.75;
                    }
                    80% {
                        opacity: 0.75;
                    }
                    100% {
                        transform: translateX(640px);
                        opacity: 0;
                    }
                }
                @keyframes marketPulse {
                    0%,
                    100% {
                        opacity: 0.25;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                .ticker-track {
                    animation: tickerMove 18s linear infinite;
                }
                @keyframes tickerMove {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-35%);
                    }
                }
            `}</style>
        </motion.section>
    )
}