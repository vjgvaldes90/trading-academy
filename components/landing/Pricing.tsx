"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

export default function Pricing() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const features = [
        t.pricingFeature1,
        t.pricingFeature2,
        t.pricingFeature3,
        t.pricingFeature4,
        t.pricingFeature5,
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
        <section
            id="pricing"
            className="relative overflow-hidden bg-[#020617] py-24 text-white sm:py-28"
        >
            {/* Section atmosphere — subtle, financial */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(37,99,235,0.14),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_70%,rgba(30,64,175,0.12),transparent_50%)]" />
                <div
                    className="absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                        maskImage:
                            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
                    }}
                />
                <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
            </div>

            <motion.div
                className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 sm:px-8 md:grid-cols-2 md:gap-14 lg:gap-16"
                {...reveal}
            >
                {/* Copy + benefits */}
                <div className="min-w-0">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/90">
                        {t.smartOptionAcademy}
                    </p>

                    <h2 className="mb-5 text-balance text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
                        {t.pricingTitle}
                    </h2>

                    <p className="mb-8 max-w-xl text-pretty text-base leading-relaxed text-slate-300 sm:mb-10 sm:text-lg">
                        {t.pricingSubtitle}
                    </p>

                    <ul className="space-y-3.5 sm:space-y-4">
                        {features.map((feature) => (
                            <li
                                key={feature}
                                className="group flex items-start gap-3 rounded-xl border border-transparent px-1 py-1 transition-colors duration-200 hover:border-white/5 hover:bg-white/[0.02]"
                            >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.12)]">
                                    <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
                                </span>
                                <span className="text-[15px] leading-snug text-slate-300 sm:text-base">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Pricing card */}
                <div className="relative mx-auto w-full max-w-md md:mx-0 md:max-w-none">
                    <div
                        className={[
                            "pointer-events-none absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-blue-500/20 via-blue-600/8 to-transparent blur-2xl",
                            motionSafe ? "soa-pricing-glow" : "",
                        ].join(" ")}
                        aria-hidden
                    />

                    <div
                        className={[
                            "relative overflow-hidden rounded-2xl border border-white/15 bg-[#0B1220]/90 p-7 shadow-[0_28px_64px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-9",
                            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/50 before:to-transparent",
                            motionSafe
                                ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:shadow-[0_32px_72px_rgba(2,6,23,0.8)]"
                                : "",
                        ].join(" ")}
                    >
                        <div
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.12),transparent_55%)]"
                            aria-hidden
                        />

                        <div className="relative text-center">
                            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                                <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">
                                    {t.pricingMembershipBadge}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[11px] font-semibold tracking-wide text-slate-300">
                                    {t.pricingLimitedBadge}
                                </span>
                            </div>

                            <p className="mb-2 text-sm text-slate-500 line-through decoration-slate-600">
                                {t.pricingAnchorPrice}
                            </p>

                            <div className="mb-3 flex items-baseline justify-center gap-2">
                                <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl">
                                    $150
                                </span>
                                <span className="pb-1 text-base font-medium text-slate-400 sm:text-lg">
                                    {t.pricingPerMonth}
                                </span>
                            </div>

                            <p className="mb-2 text-sm font-semibold text-blue-300">
                                {t.pricingLiveSessions}
                            </p>

                            <p className="mx-auto mb-8 max-w-xs text-sm leading-relaxed text-slate-400">
                                {t.pricingTagline}
                            </p>

                            <a
                                href="/login"
                                className={[
                                    "relative block w-full rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 py-4 text-center text-base font-bold text-white sm:text-lg",
                                    "shadow-[0_14px_36px_rgba(37,99,235,0.4)]",
                                    "transition duration-200",
                                    "hover:scale-[1.02] hover:border-blue-200/40 hover:brightness-110 hover:shadow-[0_18px_44px_rgba(37,99,235,0.5)]",
                                    "active:scale-[0.99]",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                                ].join(" ")}
                            >
                                {t.buyAccess}
                            </a>

                            <p className="mt-5 text-xs text-slate-500 sm:text-sm">
                                {t.pricingMicroCopy}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style jsx>{`
                @keyframes soaPricingGlow {
                    0%,
                    100% {
                        opacity: 0.75;
                    }
                    50% {
                        opacity: 1;
                    }
                }
                .soa-pricing-glow {
                    animation: soaPricingGlow 5.5s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .soa-pricing-glow {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    )
}
