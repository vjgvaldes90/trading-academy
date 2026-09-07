"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useId, useState } from "react"
import { useLanguage } from "@/context/LanguageProvider"

type TerminalTab = "stocks" | "options" | "etfs"
type TerminalRange = "1D" | "1W" | "1M"

const DEMO = {
    stocks: {
        symbol: "NASDAQ",
        price: "21,482.15",
        change: "+0.67%",
        byRange: {
            "1D": { price: "21,482.15", change: "+0.67%" },
            "1W": { price: "21,318.40", change: "+1.24%" },
            "1M": { price: "20,864.90", change: "+3.18%" },
        },
    },
    options: {
        underlying: "AAPL",
        strike: "$250",
        expiration: "SEP 19",
        premium: "$2.35",
    },
    etfs: {
        symbol: "SPY",
        price: "$658.42",
        change: "+0.42%",
    },
} as const

function SimulatedCandlesChart({
    variant,
    gradientId,
    reduceMotion,
}: {
    variant: TerminalTab
    gradientId: string
    reduceMotion: boolean
}) {
    const candles =
        variant === "options"
            ? [
                  { x: 36, wickTop: 92, wickBot: 128, bodyY: 100, h: 20, up: true },
                  { x: 78, wickTop: 78, wickBot: 122, bodyY: 86, h: 26, up: false },
                  { x: 120, wickTop: 70, wickBot: 110, bodyY: 76, h: 22, up: true },
                  { x: 162, wickTop: 58, wickBot: 98, bodyY: 64, h: 24, up: true },
                  { x: 204, wickTop: 52, wickBot: 96, bodyY: 60, h: 28, up: false },
                  { x: 246, wickTop: 44, wickBot: 84, bodyY: 50, h: 22, up: true },
                  { x: 288, wickTop: 38, wickBot: 76, bodyY: 44, h: 20, up: true },
              ]
            : variant === "etfs"
              ? [
                    { x: 36, wickTop: 100, wickBot: 132, bodyY: 108, h: 18, up: true },
                    { x: 78, wickTop: 88, wickBot: 126, bodyY: 94, h: 24, up: true },
                    { x: 120, wickTop: 76, wickBot: 118, bodyY: 84, h: 26, up: false },
                    { x: 162, wickTop: 68, wickBot: 108, bodyY: 74, h: 22, up: true },
                    { x: 204, wickTop: 58, wickBot: 98, bodyY: 66, h: 24, up: true },
                    { x: 246, wickTop: 50, wickBot: 90, bodyY: 58, h: 22, up: false },
                    { x: 288, wickTop: 42, wickBot: 80, bodyY: 48, h: 20, up: true },
                ]
              : [
                    { x: 36, wickTop: 96, wickBot: 134, bodyY: 104, h: 22, up: true },
                    { x: 78, wickTop: 82, wickBot: 128, bodyY: 90, h: 28, up: false },
                    { x: 120, wickTop: 68, wickBot: 112, bodyY: 74, h: 26, up: true },
                    { x: 162, wickTop: 56, wickBot: 100, bodyY: 62, h: 24, up: true },
                    { x: 204, wickTop: 48, wickBot: 94, bodyY: 56, h: 28, up: false },
                    { x: 246, wickTop: 40, wickBot: 82, bodyY: 46, h: 24, up: true },
                    { x: 288, wickTop: 32, wickBot: 72, bodyY: 38, h: 22, up: true },
                ]

    const linePath =
        variant === "options"
            ? "M0 120 C40 114, 70 100, 100 96 C140 90, 170 78, 210 70 C250 62, 290 54, 340 48"
            : variant === "etfs"
              ? "M0 124 C36 118, 68 108, 104 100 C148 90, 186 84, 228 72 C268 62, 304 56, 340 50"
              : "M0 122 C32 116, 58 104, 96 98 C136 90, 168 76, 208 64 C248 52, 286 44, 340 36"

    const areaPath = `${linePath} L340 160 L0 160 Z`

    return (
        <motion.svg
            key={variant}
            viewBox="0 0 340 160"
            className="h-32 w-full sm:h-36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[32, 64, 96, 128].map((y) => (
                <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="340"
                    y2={y}
                    stroke="rgba(148,163,184,0.12)"
                    strokeWidth="1"
                />
            ))}
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
                d={linePath}
                stroke="rgb(96,165,250)"
                strokeWidth="2"
                strokeLinecap="round"
                className={reduceMotion ? undefined : "soa-hero-chart-draw"}
            />
            <g opacity="0.9">
                {candles.map((c) => (
                    <g key={c.x}>
                        <line
                            x1={c.x}
                            y1={c.wickTop}
                            x2={c.x}
                            y2={c.wickBot}
                            stroke="#64748b"
                            strokeWidth="1"
                        />
                        <rect
                            x={c.x - 5}
                            y={c.bodyY}
                            width="10"
                            height={c.h}
                            rx="1"
                            fill={c.up ? "#34d399" : "#f87171"}
                        />
                    </g>
                ))}
            </g>
        </motion.svg>
    )
}

/** Interactive demo market terminal — no market data APIs. */
function HeroMarketVisual({ reduceMotion }: { reduceMotion: boolean }) {
    const { t } = useLanguage()
    const gradientId = useId().replace(/:/g, "")
    const [tab, setTab] = useState<TerminalTab>("stocks")
    const [range, setRange] = useState<TerminalRange>("1W")

    const tabs: { id: TerminalTab; label: string }[] = [
        { id: "stocks", label: t.heroTerminalTabStocks },
        { id: "options", label: t.heroTerminalTabOptions },
        { id: "etfs", label: t.heroTerminalTabEtfs },
    ]

    const ranges: TerminalRange[] = ["1D", "1W", "1M"]
    const rangeLabels: Record<TerminalRange, string> = {
        "1D": t.heroTerminalRange1D,
        "1W": t.heroTerminalRange1W,
        "1M": t.heroTerminalRange1M,
    }

    const stocksQuote = DEMO.stocks.byRange[range]

    return (
        <div
            className={[
                "relative mx-auto w-full max-w-md lg:max-w-none",
                reduceMotion ? "" : "soa-hero-float",
            ].join(" ")}
        >
            <div
                className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-transparent to-red-500/10 blur-2xl"
                aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0B1220]/88 shadow-[0_24px_60px_rgba(2,6,23,0.65)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                            <span
                                className={[
                                    "absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60",
                                    reduceMotion ? "" : "soa-hero-sim-ping",
                                ].join(" ")}
                            />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                        </span>
                        <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-300">
                            {t.heroTerminalSimulation}
                        </span>
                    </div>
                    <p className="shrink-0 text-[9px] font-medium text-slate-500 sm:text-[10px]">
                        {t.heroTerminalDemoHint}
                    </p>
                </div>

                <div
                    className="flex gap-1 border-b border-white/10 p-1.5 sm:p-2"
                    role="tablist"
                    aria-label={t.heroTerminalSimulation}
                >
                    {tabs.map((item) => {
                        const active = tab === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setTab(item.id)}
                                className={[
                                    "flex-1 rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition duration-200 sm:text-[11px]",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                                    active
                                        ? "border border-blue-300/35 bg-blue-500/20 text-blue-100 shadow-[0_0_20px_rgba(37,99,235,0.18)]"
                                        : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                                ].join(" ")}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <div className="relative px-3 pb-3 pt-3.5 sm:px-4 sm:pt-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {tab === "stocks" && (
                                <>
                                    <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                {DEMO.stocks.symbol}
                                            </p>
                                            <motion.p
                                                key={stocksQuote.price}
                                                className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-50 sm:text-3xl"
                                                initial={reduceMotion ? false : { opacity: 0.4 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.25 }}
                                            >
                                                {stocksQuote.price}
                                            </motion.p>
                                            <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">
                                                {stocksQuote.change}
                                            </p>
                                        </div>
                                        <div
                                            className="flex gap-1"
                                            role="group"
                                            aria-label="Range"
                                        >
                                            {ranges.map((r) => {
                                                const active = range === r
                                                return (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setRange(r)}
                                                        className={[
                                                            "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                                                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                                                            active
                                                                ? "border border-blue-400/30 bg-blue-500/15 text-blue-200"
                                                                : "border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200",
                                                        ].join(" ")}
                                                    >
                                                        {rangeLabels[r]}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <SimulatedCandlesChart
                                        variant="stocks"
                                        gradientId={`${gradientId}-stocks`}
                                        reduceMotion={reduceMotion}
                                    />
                                </>
                            )}

                            {tab === "options" && (
                                <>
                                    <div className="mb-3 flex items-start justify-between gap-3 px-0.5">
                                        <div>
                                            <p className="font-mono text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                                                {DEMO.options.underlying}
                                            </p>
                                            <span className="mt-1.5 inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-emerald-200">
                                                {t.heroTerminalCall}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                                {t.heroTerminalPremium}
                                            </p>
                                            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-blue-200 sm:text-xl">
                                                {DEMO.options.premium}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mb-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                                            <p className="text-[10px] text-slate-500">
                                                {t.heroTerminalStrike}
                                            </p>
                                            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">
                                                {DEMO.options.strike}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                                            <p className="text-[10px] text-slate-500">
                                                {t.heroTerminalExpiration}
                                            </p>
                                            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">
                                                {DEMO.options.expiration}
                                            </p>
                                        </div>
                                    </div>
                                    <SimulatedCandlesChart
                                        variant="options"
                                        gradientId={`${gradientId}-options`}
                                        reduceMotion={reduceMotion}
                                    />
                                </>
                            )}

                            {tab === "etfs" && (
                                <>
                                    <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                {DEMO.etfs.symbol}
                                            </p>
                                            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-50 sm:text-3xl">
                                                {DEMO.etfs.price}
                                            </p>
                                            <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">
                                                {DEMO.etfs.change}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-right">
                                            <p className="text-[10px] text-slate-500">ETF</p>
                                            <p className="mt-0.5 text-[11px] font-semibold text-slate-200">
                                                S&amp;P 500
                                            </p>
                                        </div>
                                    </div>
                                    <SimulatedCandlesChart
                                        variant="etfs"
                                        gradientId={`${gradientId}-etfs`}
                                        reduceMotion={reduceMotion}
                                    />
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
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
                                t.heroChipStocks,
                                t.heroChipOptions,
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
                @keyframes soaHeroSimPing {
                    0% {
                        transform: scale(1);
                        opacity: 0.6;
                    }
                    75%,
                    100% {
                        transform: scale(2.1);
                        opacity: 0;
                    }
                }
                @keyframes soaHeroChartDraw {
                    from {
                        stroke-dashoffset: 420;
                    }
                    to {
                        stroke-dashoffset: 0;
                    }
                }
                :global(.soa-hero-float) {
                    animation: soaHeroFloat 7s ease-in-out infinite;
                }
                .soa-hero-glow {
                    animation: soaHeroGlow 6s ease-in-out infinite;
                }
                :global(.soa-hero-sim-ping) {
                    animation: soaHeroSimPing 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                :global(.soa-hero-chart-draw) {
                    stroke-dasharray: 420;
                    animation: soaHeroChartDraw 1.1s ease-out both;
                }
                @media (prefers-reduced-motion: reduce) {
                    :global(.soa-hero-float),
                    .soa-hero-glow,
                    :global(.soa-hero-sim-ping),
                    :global(.soa-hero-chart-draw) {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    )
}
