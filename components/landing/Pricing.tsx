"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageProvider"

export default function Pricing() {
    const { t } = useLanguage()
    return (
        <motion.section
            id="pricing"
            className="bg-[#020617] py-32 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center">

                <div>
                    <h2 className="text-5xl font-bold mb-6">
                        {t.pricingTitle}
                    </h2>

                    <p className="mb-10 text-lg text-slate-300">
                        {t.pricingSubtitle}
                    </p>

                    <div className="space-y-4 text-slate-300">
                        <p>{t.pricingFeature1}</p>
                        <p>{t.pricingFeature2}</p>
                        <p>{t.pricingFeature3}</p>
                        <p>{t.pricingFeature4}</p>
                        <p>{t.pricingFeature5}</p>
                    </div>
                </div>

                <div className="relative">

                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20"></div>

                    <div className="relative rounded-2xl border border-blue-400/20 bg-[#0B1220]/95 p-10 text-center shadow-[0_24px_52px_rgba(2,6,23,0.55)]">

                        <div className="mb-4">
                            <span className="rounded-full bg-blue-500/20 px-4 py-1 text-sm text-blue-300">
                                {t.pricingLimitedBadge}
                            </span>
                        </div>

                        <p className="text-gray-500 line-through mb-2">
                            {t.pricingAnchorPrice}
                        </p>

                        <div className="mb-4">
                            <span className="text-6xl font-bold">$150</span>
                            <span className="text-gray-400 text-lg ml-2">{t.pricingPerMonth}</span>
                        </div>

                        <p className="text-blue-300 text-sm mb-4">
                            {t.pricingLiveSessions}
                        </p>

                        <p className="text-gray-400 mb-8">
                            {t.pricingTagline}
                        </p>

                        <a
                            href="/login"
                            className="block w-full rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 py-4 text-lg font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,0.35)] transition hover:scale-105 hover:brightness-110"
                        >
                            {t.buyAccess}
                        </a>

                        <p className="mt-6 text-sm text-slate-500">
                            {t.pricingMicroCopy}
                        </p>

                    </div>
                </div>

            </div>
        </motion.section>
    )
}
