"use client"

import { motion } from "framer-motion"

const steps = [
  {
    title: "Formación de alto rendimiento",
    text: "Programa elite de educación financiera orientado a inversionistas disciplinados y metódicos.",
  },
  {
    title: "Gráficos y mercado en tiempo real",
    text: "Aprende a analizar gráficos en tiempo real dentro de mentoría en vivo y metodología estructurada.",
  },
  {
    title: "Opciones, stocks y ETFs",
    text: "Domina la compra y venta de opciones con fundamentos institucionales y gestión profesional del riesgo.",
  },
  {
    title: "Ingresos consistentes con método",
    text: "Construye ingresos consistentes con una metodología estructurada, sin atajos ni promesas irreales.",
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
          De principiante a trader profesional
        </h2>

        {/* 💬 SUBTEXTO */}
        <p className="mx-auto mb-12 max-w-2xl text-slate-300">
          Educación financiera premium con enfoque en opciones, acciones y ETFs, mentoría en vivo y proceso claro paso a paso.
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
          Comienza tu formación
        </a>

      </div>
    </motion.section>
  )
}