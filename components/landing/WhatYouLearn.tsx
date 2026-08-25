"use client"

import { motion, useReducedMotion } from "framer-motion"
import { BarChart3, Shield, BookOpenCheck, ClipboardList } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

export default function WhatYouLearn() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const items = [
        { icon: BarChart3, title: t.whatYouLearnItem1Title, text: t.whatYouLearnItem1Text },
        { icon: Shield, title: t.whatYouLearnItem2Title, text: t.whatYouLearnItem2Text },
        { icon: ClipboardList, title: t.whatYouLearnItem3Title, text: t.whatYouLearnItem3Text },
        { icon: BookOpenCheck, title: t.whatYouLearnItem4Title, text: t.whatYouLearnItem4Text },
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
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(37,99,235,0.12),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_80%,rgba(30,64,175,0.1),transparent_50%)]" />
                <div
                    className="absolute inset-0 opacity-[0.3]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
                        backgroundSize: "56px 56px",
                        maskImage:
                            "radial-gradient(ellipse at center, black 18%, transparent 72%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 18%, transparent 72%)",
                    }}
                />
            </div>

            <motion.div
                className="relative mx-auto max-w-6xl px-6 text-center sm:px-8"
                {...sectionReveal}
            >
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/90">
                    {t.whatYouLearnPathLabel}
                </p>

                <h2 className="mb-4 text-balance text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                    {t.whatYouLearnTitle}
                </h2>

                <p className="mx-auto mb-12 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:mb-14 sm:text-lg">
                    {t.whatYouLearnSubtitle}
                </p>

                <ol className="relative grid gap-5 text-left sm:gap-6 md:grid-cols-2 lg:gap-7">
                    {items.map((item, i) => {
                        const Icon = item.icon
                        const step = String(i + 1).padStart(2, "0")

                        return (
                            <motion.li
                                key={item.title}
                                className="relative list-none"
                                initial={motionSafe ? { opacity: 0, y: 20 } : false}
                                whileInView={motionSafe ? { opacity: 1, y: 0 } : undefined}
                                transition={
                                    motionSafe
                                        ? {
                                              duration: 0.45,
                                              delay: 0.07 * i,
                                              ease: [0.22, 1, 0.36, 1],
                                          }
                                        : { duration: 0 }
                                }
                                viewport={{ once: true, margin: "-40px" }}
                            >
                                {/* Decorative horizontal connector between paired cards */}
                                {i % 2 === 0 ? (
                                    <span
                                        className="pointer-events-none absolute -right-3.5 top-10 z-10 hidden h-px w-7 bg-gradient-to-r from-blue-400/40 via-blue-400/20 to-transparent md:block"
                                        aria-hidden
                                    />
                                ) : null}

                                <article
                                    className={[
                                        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0B1220]/85 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-7",
                                        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/40 before:to-transparent",
                                        motionSafe
                                            ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                            : "",
                                    ].join(" ")}
                                >
                                    <div
                                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(59,130,246,0.1),transparent_55%)]"
                                        aria-hidden
                                    />

                                    <div className="relative mb-5 flex items-start justify-between gap-3">
                                        <span className="font-mono text-xs font-bold tracking-[0.2em] text-blue-300/80">
                                            {step}
                                        </span>
                                        <span
                                            className={[
                                                "flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-blue-300",
                                                "shadow-[0_0_20px_rgba(59,130,246,0.12)]",
                                                motionSafe
                                                    ? "transition duration-300 group-hover:border-blue-300/40 group-hover:bg-blue-500/15 group-hover:shadow-[0_0_28px_rgba(59,130,246,0.28)]"
                                                    : "",
                                            ].join(" ")}
                                        >
                                            <Icon className="h-5 w-5" aria-hidden />
                                        </span>
                                    </div>

                                    <h3 className="relative mb-3 text-lg font-bold tracking-tight text-slate-50 sm:text-xl">
                                        {item.title}
                                    </h3>

                                    <p className="relative text-[15px] leading-relaxed text-slate-300 sm:text-base">
                                        {item.text}
                                    </p>

                                    {/* Step indicator — decorative only */}
                                    <div
                                        className="relative mt-6 flex items-center gap-1.5 border-t border-white/10 pt-4"
                                        aria-hidden
                                    >
                                        {items.map((_, dotIndex) => {
                                            const active = dotIndex === i
                                            const passed = dotIndex < i
                                            return (
                                                <span
                                                    key={dotIndex}
                                                    className={[
                                                        "h-1.5 rounded-full",
                                                        active
                                                            ? "w-5 bg-blue-400"
                                                            : passed
                                                              ? "w-1.5 bg-blue-400/40"
                                                              : "w-1.5 bg-white/15",
                                                    ].join(" ")}
                                                />
                                            )
                                        })}
                                    </div>
                                </article>
                            </motion.li>
                        )
                    })}
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
            </motion.div>
        </section>
    )
}
