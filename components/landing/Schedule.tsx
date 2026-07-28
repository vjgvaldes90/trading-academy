"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageProvider"

export default function Schedule() {
  const { t } = useLanguage()

  const sessions = [
    { day: t.scheduleMonday, title: t.scheduleSessionTitle, time: t.scheduleSessionTime },
    { day: t.scheduleTuesday, title: t.scheduleSessionTitle, time: t.scheduleSessionTime },
    { day: t.scheduleWednesday, title: t.scheduleSessionTitle, time: t.scheduleSessionTime },
  ]

  return (
    <motion.section
      className="bg-black py-24 text-white"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-5xl mx-auto px-8 text-center">

        <p className="mb-4 font-semibold text-blue-300">
          {t.scheduleEyebrow}
        </p>

        <h2 className="text-4xl font-bold mb-6">
          {t.scheduleTitle}
        </h2>

        <p className="mb-12 text-slate-300">
          {t.scheduleSubtitle}
        </p>

        <div className="grid md:grid-cols-3 gap-8">

          {sessions.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-blue-400/20 bg-[#0B1220]/90 p-6 shadow-[0_16px_34px_rgba(2,6,23,0.45)]"
            >
              <h3 className="mb-2 text-xl font-semibold text-blue-300">
                {s.day}
              </h3>

              <p className="text-slate-300">
                {s.title}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {s.time}
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

        <p className="mt-6 text-sm text-slate-500">
          {t.scheduleFootnote}
        </p>

      </div>
    </motion.section>
  )
}
