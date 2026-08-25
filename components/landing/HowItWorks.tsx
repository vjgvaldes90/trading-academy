"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useLanguage } from "@/context/LanguageProvider"

export default function HowItWorks() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const steps = [
        { title: t.howItWorksStep1Title, text: t.howItWorksStep1Text },
        { title: t.howItWorksStep2Title, text: t.howItWorksStep2Text },
        { title: t.howItWorksStep3Title, text: t.howItWorksStep3Text },
        { title: t.howItWorksStep4Title, text: t.howItWorksStep4Text },
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
        <section id="how" className="relative overflow-hidden bg-[#020617] py-24 text-white sm:py-28">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.08),transparent_55%)]" />
            </div>

            <motion.div
                className="relative mx-auto max-w-6xl px-6 text-center sm:px-8"
                {...sectionReveal}
            >
                <h2 className="mb-4 text-balance text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                    {t.howItWorksTitle}
                </h2>

                <p className="mx-auto mb-12 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:mb-14 sm:text-lg">
                    {t.howItWorksSubtitle}
                </p>

                <div className="grid gap-5 text-left sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, i) => (
                        <div
                            key={step.title}
                            className={[
                                "rounded-2xl border border-white/12 bg-[#0B1220]/85 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-7",
                                motionSafe
                                    ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                    : "",
                            ].join(" ")}
                        >
                            <div className="mb-4 font-mono text-xs font-bold tracking-[0.2em] text-blue-300/80">
                                {String(i + 1).padStart(2, "0")}
                            </div>

                            <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-50 sm:text-xl">
                                {step.title}
                            </h3>

                            <p className="text-[15px] leading-relaxed text-slate-300 sm:text-base">
                                {step.text}
                            </p>
                        </div>
                    ))}
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
            </motion.div>
        </section>
    )
}
