"use client"

import { motion } from "framer-motion"

const steps = [
  {
    title: "Accede a las sesiones en vivo",
    text: "Conéctate varias veces por semana y observa cómo se analiza el mercado en tiempo real.",
  },
  {
    title: "Aprende a identificar oportunidades",
    text: "Descubre exactamente cuándo entrar y salir con estrategias claras y aplicables.",
  },
  {
    title: "Opera con confianza",
    text: "Aplica lo aprendido paso a paso y toma decisiones sin adivinar el mercado.",
  },
]

export default function HowItWorks() {
  return (
    <motion.section
      className="bg-[#020617] py-24 text-white"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-6xl mx-auto px-8 text-center">

        {/* 🔥 TITULO */}
        <h2 className="mb-4 text-4xl font-bold text-slate-100">
          Así es como empiezas a mejorar en trading
        </h2>

        {/* 💬 SUBTEXTO */}
        <p className="mx-auto mb-12 max-w-2xl text-slate-300">
          No necesitas experiencia previa. Solo seguir el proceso paso a paso.
        </p>

        {/* 🧱 STEPS */}
        <div className="grid md:grid-cols-3 gap-10">

          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-xl border border-blue-400/20 bg-[#0B1220]/90 p-8 shadow-[0_18px_40px_rgba(2,6,23,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(30,64,175,0.32)]"
            >
              <div className="mb-4 text-3xl font-bold text-blue-400">
                {i + 1}
              </div>

              <h3 className="mb-3 text-xl font-semibold text-slate-100">
                {step.title}
              </h3>

              <p className="text-slate-300">
                {step.text}
              </p>
            </div>
          ))}

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