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
      className="bg-white py-24"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-6xl mx-auto px-8 text-center">

        {/* 🔥 TITULO */}
        <h2 className="text-4xl font-bold mb-4 text-gray-900">
          Así es como empiezas a mejorar en trading
        </h2>

        {/* 💬 SUBTEXTO */}
        <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
          No necesitas experiencia previa. Solo seguir el proceso paso a paso.
        </p>

        {/* 🧱 STEPS */}
        <div className="grid md:grid-cols-3 gap-10">

          {steps.map((step, i) => (
            <div
              key={i}
              className="p-8 rounded-xl bg-gray-50 shadow hover:shadow-xl transition"
            >
              <div className="text-3xl font-bold text-green-500 mb-4">
                {i + 1}
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {step.title}
              </h3>

              <p className="text-gray-700">
                {step.text}
              </p>
            </div>
          ))}

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