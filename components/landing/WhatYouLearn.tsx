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
      className="bg-white py-24"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-6xl mx-auto px-8 text-center">

        {/* 🧠 TITULO */}
        <h2 className="text-4xl font-bold mb-12 text-gray-900">
          Qué aprenderás en el programa
        </h2>

        {/* 🧱 GRID */}
        <div className="grid md:grid-cols-3 gap-10">

          {items.map((item, i) => {
            const Icon = item.icon

            return (
              <div
                key={i}
                className="bg-white p-8 rounded-xl shadow hover:shadow-2xl transition transform hover:-translate-y-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="text-green-500" size={28} />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {item.title}
                  </h3>
                </div>

                <p className="text-gray-700">
                  {item.text}
                </p>
              </div>
            )
          })}

        </div>

        {/* 💰 CTA */}
        <a
          href="/login"
          className="inline-block mt-12 bg-green-500 text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-green-400 transition transform hover:scale-105"
        >
          🚀 Empezar ahora
        </a>

      </div>
    </motion.section>
  )
}