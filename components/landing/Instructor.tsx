"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useLanguage } from "@/context/LanguageProvider"

export default function Instructor() {
    const { t } = useLanguage()

    return (
        <motion.section
            className="bg-[#020617] py-24 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center">

                <div className="flex justify-center">
                    <Image
                        src="/toni.png"
                        alt={t.instructorImageAlt}
                        width={350}
                        height={420}
                        className="w-[350px] rounded-2xl border border-blue-400/20 object-cover shadow-[0_25px_55px_rgba(2,6,23,0.65)]"
                    />
                </div>

                <div>

                    <p className="mb-2 font-semibold text-blue-400">
                        {t.instructorEyebrow}
                    </p>

                    <h2 className="mb-6 text-4xl font-bold text-slate-100">
                        {t.instructorTitle}
                    </h2>

                    <p className="mb-4 text-lg text-slate-300">
                        {t.instructorParagraph1}
                    </p>

                    <p className="mb-4 text-lg text-slate-300">
                        {t.instructorParagraph2}
                    </p>

                    <p className="text-lg text-slate-300">
                        {t.instructorParagraph3}
                    </p>

                    <a
                        href="/login"
                        className="mt-6 inline-block rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)] transition hover:brightness-110"
                    >
                        {t.buyAccess}
                    </a>

                </div>

            </div>
        </motion.section>
    )
}
