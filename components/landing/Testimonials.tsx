"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageProvider"

export default function Testimonials() {
    const { t } = useLanguage()

    const testimonials = [
        { name: t.testimonial1Name, text: t.testimonial1Text },
        { name: t.testimonial2Name, text: t.testimonial2Text },
        { name: t.testimonial3Name, text: t.testimonial3Text },
    ]

    return (
        <motion.section
            className="bg-[#030712] py-24 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 text-center">

                <h2 className="mb-4 text-4xl font-bold text-slate-100">
                    {t.testimonialsTitle}
                </h2>

                <p className="mb-12 text-slate-300">
                    {t.testimonialsSubtitle}
                </p>

                <div className="grid md:grid-cols-3 gap-8">

                    {testimonials.map((item, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-blue-400/20 bg-[#0B1220]/90 p-6 text-left shadow-[0_18px_40px_rgba(2,6,23,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(30,64,175,0.28)]"
                        >
                            <p className="mb-4 text-slate-300">"{item.text}"</p>

                            <p className="font-semibold text-slate-100">
                                {item.name}
                            </p>
                        </div>
                    ))}

                </div>

                <a
                    href="/login"
                    className="mt-12 inline-block rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,0.35)] transition hover:scale-105 hover:brightness-110"
                >
                    {t.buyAccess}
                </a>

            </div>
        </motion.section>
    )
}
