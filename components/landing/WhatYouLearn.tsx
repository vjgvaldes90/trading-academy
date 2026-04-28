"use client"

import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Shield,
  Brain,
  Monitor,
  GraduationCap,
} from "lucide-react"

const items = [
  {
    icon: BarChart3,
    title: "Análisis del Mercado",
    text: "Aprende a leer gráficos y entender la estructura del mercado.",
  },
  {
    icon: TrendingUp,
    title: "Estrategias de Trading",
    text: "Conocerás estrategias profesionales utilizadas por traders.",
  },
  {
    icon: Shield,
    title: "Gestión de Riesgo",
    text: "Aprende a proteger tu capital y manejar el riesgo correctamente.",
  },
  {
    icon: Brain,
    title: "Psicología del Trading",
    text: "Control emocional y disciplina para operar de forma consistente.",
  },
  {
    icon: Monitor,
    title: "Trading en Vivo",
    text: "Operaciones en vivo donde verás cómo se toman decisiones reales.",
  },
  {
    icon: GraduationCap,
    title: "Mentoría Directa",
    text: "Podrás hacer preguntas y recibir guía directa del instructor.",
  },
]

export default function WhatYouLearn() {
  return (
    <motion.section
      className="bg-[#030712] py-24 text-white"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-6xl mx-auto px-8 text-center">

        {/* 🧠 TITULO */}
        <h2 className="mb-12 text-4xl font-bold text-slate-100">
          Qué aprenderás en el programa
        </h2>

        {/* 🧱 GRID */}
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

        {/* 💰 CTA */}
        <a
          href="/login"
          className="mt-12 inline-block rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,0.35)] transition hover:scale-105 hover:brightness-110"
        >
          🚀 Empezar ahora
        </a>

      </div>
    </motion.section>
  )
}