"use client"

import { motion } from "framer-motion"

const sessions = [
  {
    day: "Lunes",
    title: "Análisis del mercado",
    time: "7:00 PM (EST)",
  },
  {
    day: "Miércoles",
    title: "Trading en vivo",
    time: "7:00 PM (EST)",
  },
  {
    day: "Viernes",
    title: "Revisión de operaciones",
    time: "7:00 PM (EST)",
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
        <p className="text-red-500 font-semibold mb-4">
          ⚠️ Cupos limitados en cada sesión en vivo
        </p>

        {/* 🧠 TITULO */}
        <h2 className="text-4xl font-bold mb-6">
          Horarios de las sesiones en vivo
        </h2>

        {/* 💬 SUBTEXTO */}
        <p className="text-gray-400 mb-12">
          Conéctate varias veces por semana y aprende directamente en el mercado real
        </p>

        {/* 🧱 GRID */}
        <div className="grid md:grid-cols-3 gap-8">

          {sessions.map((s, i) => (
            <div
              key={i}
              className="bg-white/5 p-6 rounded-xl border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-2 text-green-400">
                {s.day}
              </h3>

              <p className="text-gray-300">
                {s.title}
              </p>

              <p className="text-sm text-gray-400 mt-2">
                {s.time}
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

        {/* 🕒 NOTA */}
        <p className="mt-6 text-sm text-gray-500">
          *Todos los horarios en hora de Nueva York (EST)
        </p>

      </div>
    </motion.section>
  )
}