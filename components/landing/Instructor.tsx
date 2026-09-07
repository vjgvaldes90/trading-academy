"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useLanguage } from "@/context/LanguageProvider"

/** Purely decorative abstract market lines — no live data. */
function InstructorMarketDecor({ reduceMotion }: { reduceMotion: boolean }) {
    return (
        <div
            className={[
                "pointer-events-none absolute inset-0 overflow-hidden",
                reduceMotion ? "" : "soa-instructor-float",
            ].join(" ")}
            aria-hidden
        >
            <svg
                viewBox="0 0 320 400"
                className="absolute -right-6 top-8 h-[70%] w-auto opacity-[0.18] sm:-right-4"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M10 280 C40 260, 55 220, 85 230 C115 240, 130 180, 160 160 C190 140, 210 190, 240 120 C260 85, 285 70, 310 55"
                    stroke="rgb(96,165,250)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <path
                    d="M10 300 C45 290, 60 250, 95 255 C130 260, 145 210, 175 195 C205 180, 225 220, 255 150 C275 115, 295 100, 310 90"
                    stroke="rgba(148,163,184,0.55)"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeDasharray="4 6"
                />
                {[
                    [48, 248, 18],
                    [98, 220, -14],
                    [148, 175, 12],
                    [198, 155, -20],
                    [248, 110, 10],
                ].map(([x, y, h], i) => (
                    <g key={i}>
                        <line
                            x1={x}
                            y1={y - Math.abs(h) - 8}
                            x2={x}
                            y2={y + Math.abs(h) + 8}
                            stroke="rgba(148,163,184,0.35)"
                            strokeWidth="1"
                        />
                        <rect
                            x={x - 4}
                            y={h >= 0 ? y - h : y}
                            width="8"
                            height={Math.abs(h) || 8}
                            rx="1"
                            fill={h >= 0 ? "rgba(52,211,153,0.45)" : "rgba(248,113,113,0.4)"}
                        />
                    </g>
                ))}
            </svg>
        </div>
    )
}

export default function Instructor() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const methodPoints = [
        t.instructorParagraph1,
        t.instructorParagraph2,
        t.instructorParagraph3,
    ]

    const focusTags = [
        t.instructorFocusStocks,
        t.instructorFocusOptions,
        t.instructorFocusEtfs,
        t.instructorFocusRisk,
    ]

    const reveal = motionSafe
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
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_40%,rgba(37,99,235,0.14),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_70%,rgba(30,64,175,0.1),transparent_45%)]" />
                <div
                    className="absolute inset-0 opacity-[0.32]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
                        backgroundSize: "56px 56px",
                        maskImage:
                            "radial-gradient(ellipse at 30% 50%, black 10%, transparent 70%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at 30% 50%, black 10%, transparent 70%)",
                    }}
                />
            </div>

            <motion.div
                className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 sm:px-8 md:grid-cols-2 md:gap-14 lg:gap-16"
                {...reveal}
            >
                {/* Photo — existing /toni.png asset */}
                <div className="relative mx-auto w-full max-w-[360px] md:mx-0 md:max-w-none">
                    <InstructorMarketDecor reduceMotion={!motionSafe} />

                    <div
                        className={[
                            "pointer-events-none absolute -inset-4 rounded-[1.75rem] bg-gradient-to-br from-blue-500/30 via-blue-600/10 to-transparent blur-2xl",
                            motionSafe ? "soa-instructor-glow" : "",
                        ].join(" ")}
                        aria-hidden
                    />

                    <div
                        className={[
                            "relative overflow-hidden rounded-2xl border border-white/15 bg-[#0B1220]/60 shadow-[0_28px_64px_rgba(2,6,23,0.75)]",
                            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/50 before:to-transparent",
                            motionSafe ? "soa-instructor-portrait" : "",
                        ].join(" ")}
                    >
                        <Image
                            src="/toni.png"
                            alt={t.instructorImageAlt}
                            width={350}
                            height={420}
                            className="relative z-[1] h-auto w-full object-cover object-top"
                            sizes="(max-width: 768px) 360px, 420px"
                            priority={false}
                        />
                        <div
                            className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#020617]/75 via-transparent to-blue-950/10"
                            aria-hidden
                        />
                    </div>
                </div>

                {/* Copy */}
                <div className="min-w-0 text-center md:text-left">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/90">
                        {t.instructorEyebrow}
                    </p>

                    <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-300">
                        {t.instructorMentorLabel}
                    </p>

                    <h2 className="mb-6 text-balance text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-50 sm:text-4xl">
                        {t.instructorTitle}
                    </h2>

                    <div className="mb-7 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                        {focusTags.map((label) => (
                            <span
                                key={label}
                                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-300"
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    <ol className="mb-8 space-y-3 text-left">
                        {methodPoints.map((text, index) => (
                            <li
                                key={text}
                                className={[
                                    "flex gap-3 rounded-xl border border-white/10 bg-[#0B1220]/70 p-3.5 backdrop-blur-sm sm:p-4",
                                    motionSafe
                                        ? "transition duration-200 hover:border-blue-300/25 hover:bg-[#0B1220]/90"
                                        : "",
                                ].join(" ")}
                            >
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-400/25 bg-blue-500/10 text-[11px] font-bold tabular-nums text-blue-200">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <p className="text-[15px] leading-relaxed text-slate-300 sm:text-base">
                                    {text}
                                </p>
                            </li>
                        ))}
                    </ol>

                    <a
                        href="/login"
                        className={[
                            "inline-block rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-base font-bold text-white sm:text-lg",
                            "shadow-[0_14px_36px_rgba(37,99,235,0.4)]",
                            "transition duration-200",
                            "hover:scale-[1.02] hover:border-blue-200/40 hover:brightness-110 hover:shadow-[0_18px_44px_rgba(37,99,235,0.5)]",
                            "active:scale-[0.99]",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                        ].join(" ")}
                    >
                        {t.buyAccess}
                    </a>
                </div>
            </motion.div>

            <style jsx>{`
                @keyframes soaInstructorGlow {
                    0%,
                    100% {
                        opacity: 0.7;
                    }
                    50% {
                        opacity: 1;
                    }
                }
                @keyframes soaInstructorFloat {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-6px);
                    }
                }
                .soa-instructor-glow {
                    animation: soaInstructorGlow 5.5s ease-in-out infinite;
                }
                .soa-instructor-portrait {
                    animation: soaInstructorFloat 7s ease-in-out infinite;
                }
                .soa-instructor-float {
                    animation: soaInstructorFloat 9s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .soa-instructor-glow,
                    .soa-instructor-portrait,
                    .soa-instructor-float {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    )
}
