"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

type CheckoutPlanId = "trading_only" | "full_program"

type PlanFeature = {
    title: string
    detail?: string
}

function PlanCard({
    plan,
    highlighted,
    name,
    priceBlock,
    features,
    cta,
    microCopy,
    motionSafe,
}: {
    plan: CheckoutPlanId
    highlighted?: boolean
    name: string
    priceBlock: ReactNode
    features: PlanFeature[]
    cta: string
    microCopy: string
    motionSafe: boolean
}) {
    return (
        <div
            className={[
                "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0B1220]/90 p-6 shadow-[0_28px_64px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-7",
                "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/50 before:to-transparent",
                highlighted
                    ? "border-blue-300/45 ring-1 ring-blue-400/30"
                    : "border-white/15",
                motionSafe
                    ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:shadow-[0_32px_72px_rgba(2,6,23,0.8)]"
                    : "",
            ].join(" ")}
        >
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.12),transparent_55%)]"
                aria-hidden
            />

            <div className="relative flex h-full flex-col text-center">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">
                        {name}
                    </span>
                </div>

                <div className="mb-6 flex min-h-[4.5rem] items-center justify-center sm:min-h-[5rem]">
                    {priceBlock}
                </div>

                <ul className="mb-7 flex-1 space-y-2.5 text-left">
                    {features.map((feature) => (
                        <li key={feature.title} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                                <Check className="h-3 w-3" strokeWidth={2.75} aria-hidden />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm leading-snug text-slate-300">
                                    {feature.title}
                                </span>
                                {feature.detail ? (
                                    <span className="mt-0.5 block text-xs leading-snug text-slate-400 sm:text-[13px]">
                                        {feature.detail}
                                    </span>
                                ) : null}
                            </span>
                        </li>
                    ))}
                </ul>

                <a
                    href={`/login?plan=${plan}`}
                    className={[
                        "relative mt-auto block w-full rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 py-3.5 text-center text-base font-bold text-white",
                        "shadow-[0_14px_36px_rgba(37,99,235,0.4)]",
                        "transition duration-200",
                        "hover:scale-[1.02] hover:border-blue-200/40 hover:brightness-110 hover:shadow-[0_18px_44px_rgba(37,99,235,0.5)]",
                        "active:scale-[0.99]",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                    ].join(" ")}
                >
                    {cta}
                </a>

                <p className="mt-4 text-xs text-slate-500 sm:text-sm">{microCopy}</p>
            </div>
        </div>
    )
}

export default function Pricing() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

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

    const tradingFeatures: PlanFeature[] = [
        {
            title: t.pricingTradingOnlyFeature1,
            detail: t.pricingTradingSessionsSchedule,
        },
        { title: t.pricingTradingOnlyFeature2 },
        { title: t.pricingTradingOnlyFeature3 },
    ]

    const fullFeatures: PlanFeature[] = [
        { title: t.pricingFullProgramFeature1 },
        {
            title: t.pricingFullProgramFeature2,
            detail: t.pricingTradingSessionsSchedule,
        },
        { title: t.pricingFullProgramFeature3 },
        { title: t.pricingFullProgramFeature4 },
    ]

    return (
        <section
            id="pricing"
            className="relative overflow-hidden bg-[#020617] py-24 text-white sm:py-28"
        >
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

            <motion.div className="relative mx-auto max-w-6xl px-6 sm:px-8" {...reveal}>
                <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/90">
                        {t.smartOptionAcademy}
                    </p>
                    <h2 className="mb-4 text-balance text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
                        {t.pricingTitle}
                    </h2>
                    <p className="text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
                        {t.pricingSubtitle}
                    </p>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200/90">
                        {t.pricingChoosePlan}
                    </p>
                </div>

                <div className="relative grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-7 lg:gap-8">
                    <div
                        className={[
                            "pointer-events-none absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-blue-500/20 via-blue-600/8 to-transparent blur-2xl",
                            motionSafe ? "soa-pricing-glow" : "",
                        ].join(" ")}
                        aria-hidden
                    />

                    <PlanCard
                        plan="trading_only"
                        motionSafe={Boolean(motionSafe)}
                        name={t.pricingTradingOnlyName}
                        features={tradingFeatures}
                        cta={t.pricingTradingOnlyCta}
                        microCopy={t.pricingMicroCopy}
                        priceBlock={
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                                    {t.pricingTradingOnlyPrice}
                                </span>
                                <span className="pb-1 text-base font-medium text-slate-400">
                                    {t.pricingTradingOnlyCadence}
                                </span>
                            </div>
                        }
                    />

                    <PlanCard
                        plan="full_program"
                        highlighted
                        motionSafe={Boolean(motionSafe)}
                        name={t.pricingFullProgramName}
                        features={fullFeatures}
                        cta={t.pricingFullProgramCta}
                        microCopy={t.pricingMicroCopy}
                        priceBlock={
                            <div className="flex items-baseline justify-center">
                                <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                                    {t.pricingFullProgramPrice}
                                </span>
                            </div>
                        }
                    />
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
