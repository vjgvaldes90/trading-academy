"use client"

import { motion } from "framer-motion"
import { BarChart3, Shield, BookOpenCheck, ClipboardList } from "lucide-react"
import { useLanguage } from "@/context/LanguageProvider"

export default function WhatYouLearn() {
  const { t } = useLanguage()

  const items = [
    { icon: BarChart3, title: t.whatYouLearnItem1Title, text: t.whatYouLearnItem1Text },
    { icon: Shield, title: t.whatYouLearnItem2Title, text: t.whatYouLearnItem2Text },
    { icon: ClipboardList, title: t.whatYouLearnItem3Title, text: t.whatYouLearnItem3Text },
    { icon: BookOpenCheck, title: t.whatYouLearnItem4Title, text: t.whatYouLearnItem4Text },
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

        <h2 className="mb-6 text-4xl font-bold text-slate-100">
          {t.whatYouLearnTitle}
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-slate-300">
          {t.whatYouLearnSubtitle}
        </p>

        <div className="grid md:grid-cols-3 gap-10">

          {items.map((item, i) => {
            const Icon = item.icon

            return (
              <div
                key={i}
                className="transform rounded-xl border border-blue-400/20 bg-[#0B1220]/90 p-8 shadow-[0_18px_40px_rgba(2,6,23,0.55)] transition hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(30,64,175,0.28)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="text-blue-400" size={28} />
                  <h3 className="text-xl font-semibold text-slate-100">
                    {item.title}
                  </h3>
                </div>

                <p className="text-slate-300">
                  {item.text}
                </p>
              </div>
            )
          })}

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
