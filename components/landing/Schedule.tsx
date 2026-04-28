"use client"

import { motion } from "framer-motion"

const sessions = [
  {
    day: "Lunes",
    title: "Trading en vivo",
    time: "9:30 AM (EST)",
  },
  {
    day: "Martes",
    title: "Trading en vivo",
    time: "9:30 AM (EST)",
  },
  {
    day: "Miercoles",
    title: "Trading en vivo",
    time: "9:30 AM (EST)",
  },
]

export default function Schedule() {
  return (
    <motion.section
      className="bg-black py-24 text-white"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-5xl mx-auto px-8 text-center">

        {/* 🔥 URGENCIA */}
        <p className="mb-4 font-semibold text-red-400">
          ⚠️ Cupos limitados en cada sesión en vivo
        </p>

        {/* 🧠 TITULO */}
        <h2 className="text-4xl font-bold mb-6">
          Horarios de las sesiones en vivo
        </h2>

        {/* 💬 SUBTEXTO */}
        <p className="mb-12 text-slate-300">
          Conéctate varias veces por semana y aprende directamente en el mercado real
        </p>

        {/* 🧱 GRID */}
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

        {/* 💰 CTA */}
        <a
          href="/login"
          className="mt-12 inline-block rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,0.35)] transition hover:scale-105 hover:brightness-110"
        >
          🚀 Empezar ahora
        </a>

        {/* 🕒 NOTA */}
        <p className="mt-6 text-sm text-slate-500">
          *Todos los horarios en hora de Nueva York (EST)
        </p>

      </div>
    </motion.section>
  )
}