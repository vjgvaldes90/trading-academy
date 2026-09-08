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
    badge,
    name,
    priceBlock,
    features,
    cta,
    microCopy,
    motionSafe,
    delay = 0,
}: {
    plan: CheckoutPlanId
    highlighted?: boolean
    badge?: string
    name: string
    priceBlock: ReactNode
    features: PlanFeature[]
    cta: string
    microCopy: string
    motionSafe: boolean
    delay?: number
}) {
    const cardMotion = motionSafe
        ? {
              initial: { opacity: 0, y: 28 },
              whileInView: { opacity: 1, y: 0 },
              transition: {
                  duration: 0.5,
                  delay,
                  ease: [0.22, 1, 0.36, 1] as const,
              },
              viewport: { once: true, margin: "-50px" as const },
          }
        : {
              initial: { opacity: 1, y: 0 },
              whileInView: { opacity: 1, y: 0 },
              transition: { duration: 0 },
              viewport: { once: true },
          }

    return (
        <motion.div
            className={[
                "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0B1220]/92 p-6 backdrop-blur-xl sm:p-7",
                "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/55 before:to-transparent",
                highlighted
                    ? [
                          "border-blue-300/55",
                          "ring-1 ring-blue-400/40",
                          "shadow-[0_28px_70px_rgba(2,6,23,0.75),0_0_48px_rgba(37,99,235,0.22)]",
                      ].join(" ")
                    : [
                          "border-white/18",
                          "shadow-[0_24px_56px_rgba(2,6,23,0.72),0_0_28px_rgba(37,99,235,0.08)]",
                      ].join(" "),
                motionSafe
                    ? highlighted
                        ? "transition duration-300 hover:-translate-y-1.5 hover:border-blue-200/55 hover:shadow-[0_36px_80px_rgba(2,6,23,0.82),0_0_56px_rgba(37,99,235,0.3)]"
                        : "transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:shadow-[0_32px_72px_rgba(2,6,23,0.8),0_0_36px_rgba(37,99,235,0.14)]"
                    : "",
            ].join(" ")}
            {...cardMotion}
        >
            <div
                className={[
                    "pointer-events-none absolute inset-0",
                    highlighted
                        ? "bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.2),transparent_58%)]"
                        : "bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.1),transparent_55%)]",
                ].join(" ")}
                aria-hidden
            />

            {highlighted && badge ? (
                <div className="relative mb-3 flex justify-center">
                    <span className="rounded-full border border-amber-300/35 bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.18)]">
                        {badge}
                    </span>
                </div>
            ) : null}

            <div className="relative flex h-full flex-col text-center">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                    <span
                        className={[
                            "rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                            highlighted
                                ? "border border-blue-300/45 bg-blue-500/20 text-blue-100"
                                : "border border-blue-400/30 bg-blue-500/15 text-blue-200",
                        ].join(" ")}
                    >
                        {name}
                    </span>
                </div>

                <div className="mb-6 flex min-h-[4.75rem] items-center justify-center sm:min-h-[5.25rem]">
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
                        "relative mt-auto block w-full rounded-xl border border-blue-300/35 bg-gradient-to-r from-blue-500 to-blue-700 py-3.5 text-center text-base font-bold text-white",
                        "shadow-[0_16px_40px_rgba(37,99,235,0.45)]",
                        "transition duration-200",
                        "hover:scale-[1.02] hover:border-blue-200/45 hover:brightness-110 hover:shadow-[0_20px_48px_rgba(37,99,235,0.55)]",
                        "active:scale-[0.99]",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                    ].join(" ")}
                >
                    {cta}
                </a>

                <p className="mt-4 text-xs text-slate-500 sm:text-sm">{microCopy}</p>
            </div>
        </motion.div>
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
            className="relative overflow-hidden bg-[#020617] pb-28 pt-28 text-white sm:pb-32 sm:pt-32 lg:pt-36"
        >
            {/* Soft top fade — separation from Hero without a hard color break */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#020617] via-[#020617]/80 to-transparent sm:h-36"
                aria-hidden
            />

            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(37,99,235,0.22),transparent_52%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(37,99,235,0.14),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_75%,rgba(30,64,175,0.14),transparent_48%)]" />
                <div
                    className="absolute inset-0 opacity-[0.38]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                        maskImage:
                            "radial-gradient(ellipse at center, black 22%, transparent 72%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 22%, transparent 72%)",
                    }}
                />
                <div
                    className={[
                        "absolute left-1/2 top-[42%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/14 blur-[110px]",
                        motionSafe ? "soa-pricing-glow" : "",
                    ].join(" ")}
                />
            </div>

            <motion.div className="relative mx-auto max-w-6xl px-6 sm:px-8" {...reveal}>
                <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/90">
                        {t.smartOptionAcademy}
                    </p>
                    <h2 className="mb-5 text-balance text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
                        {t.pricingTitle}
                    </h2>
                    <p className="text-pretty text-3xl leading-relaxed text-slate-300 sm:text-4xl lg:text-5xl">
                        {t.pricingSubtitle}
                    </p>
                    <p
                        className={[
                            "mt-8 inline-flex items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/10 px-5 py-2",
                            "text-sm font-extrabold uppercase tracking-[0.22em] text-blue-100",
                            "shadow-[0_0_28px_rgba(37,99,235,0.22)]",
                            "sm:mt-9 sm:text-[15px] sm:tracking-[0.26em]",
                        ].join(" ")}
                    >
                        {t.pricingChoosePlan}
                    </p>
                </div>

                <div className="relative grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-7 lg:gap-8">
                    <div
                        className={[
                            "pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/25 via-blue-600/10 to-transparent blur-2xl",
                            motionSafe ? "soa-pricing-glow" : "",
                        ].join(" ")}
                        aria-hidden
                    />

                    <PlanCard
                        plan="trading_only"
                        motionSafe={Boolean(motionSafe)}
                        delay={0.05}
                        name={t.pricingTradingOnlyName}
                        features={tradingFeatures}
                        cta={t.pricingTradingOnlyCta}
                        microCopy={t.pricingMicroCopy}
                        priceBlock={
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-[3.25rem] font-extrabold tracking-tight text-transparent sm:text-6xl lg:text-[4rem]">
                                    {t.pricingTradingOnlyPrice}
                                </span>
                                <span className="pb-1.5 text-base font-medium text-slate-400">
                                    {t.pricingTradingOnlyCadence}
                                </span>
                            </div>
                        }
                    />

                    <PlanCard
                        plan="full_program"
                        highlighted
                        motionSafe={Boolean(motionSafe)}
                        delay={0.12}
                        name={t.pricingFullProgramName}
                        features={fullFeatures}
                        cta={t.pricingFullProgramCta}
                        microCopy={t.pricingMicroCopy}
                        priceBlock={
                            <div className="flex items-baseline justify-center">
                                <span className="bg-gradient-to-b from-white via-blue-50 to-slate-300 bg-clip-text text-[3.25rem] font-extrabold tracking-tight text-transparent sm:text-6xl lg:text-[4rem]">
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
                        opacity: 0.7;
                    }
                    50% {
                        opacity: 1;
                    }
                }
                :global(.soa-pricing-glow) {
                    animation: soaPricingGlow 5.5s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    :global(.soa-pricing-glow) {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    )
}
