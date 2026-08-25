"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Quote } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function Testimonials() {
    const { t } = useLanguage()
    const reduceMotion = useReducedMotion()
    const motionSafe = !reduceMotion

    const testimonials = [
        { name: t.testimonial1Name, text: t.testimonial1Text },
        { name: t.testimonial2Name, text: t.testimonial2Text },
        { name: t.testimonial3Name, text: t.testimonial3Text },
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
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.12),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_80%,rgba(30,64,175,0.1),transparent_45%)]" />
                <div
                    className="absolute inset-0 opacity-[0.3]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
                        backgroundSize: "56px 56px",
                        maskImage:
                            "radial-gradient(ellipse at center, black 15%, transparent 72%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 15%, transparent 72%)",
                    }}
                />
            </div>

            <motion.div
                className="relative mx-auto max-w-6xl px-6 text-center sm:px-8"
                {...sectionReveal}
            >
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/90">
                    {t.smartOptionAcademy}
                </p>

                <h2 className="mb-4 text-balance text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                    {t.testimonialsTitle}
                </h2>

                <p className="mx-auto mb-12 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:mb-14 sm:text-lg">
                    {t.testimonialsSubtitle}
                </p>

                <ul className="grid gap-5 text-left sm:gap-6 md:grid-cols-3 md:items-stretch md:gap-6 lg:gap-7">
                    {testimonials.map((item, i) => {
                        const featured = i === 1
                        return (
                            <motion.li
                                key={item.name}
                                className="h-full list-none"
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
                                        "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 sm:p-7",
                                        "bg-[#0B1220]/85 backdrop-blur-xl",
                                        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/40 before:to-transparent",
                                        featured
                                            ? "border-blue-400/30 shadow-[0_24px_56px_rgba(2,6,23,0.7)] md:-translate-y-1 md:ring-1 md:ring-blue-400/20"
                                            : "border-white/12 shadow-[0_18px_44px_rgba(2,6,23,0.55)]",
                                        motionSafe
                                            ? "transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:shadow-[0_26px_56px_rgba(2,6,23,0.72)]"
                                            : "",
                                    ].join(" ")}
                                >
                                    <div
                                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(59,130,246,0.1),transparent_50%)]"
                                        aria-hidden
                                    />

                                    <Quote
                                        className="relative mb-4 h-7 w-7 text-blue-400/45"
                                        strokeWidth={1.5}
                                        aria-hidden
                                    />

                                    <blockquote className="relative flex-1">
                                        <p className="text-[15px] leading-relaxed text-slate-300 sm:text-base">
                                            {item.text}
                                        </p>
                                    </blockquote>

                                    <footer className="relative mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                                        <span
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-blue-500/25 to-slate-800/80 text-xs font-bold tracking-wide text-blue-100"
                                            aria-hidden
                                        >
                                            {initialsFromName(item.name)}
                                        </span>
                                        <div className="min-w-0">
                                            <cite className="block truncate text-sm font-semibold not-italic text-slate-100 sm:text-[15px]">
                                                {item.name}
                                            </cite>
                                        </div>
                                    </footer>
                                </article>
                            </motion.li>
                        )
                    })}
                </ul>

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
