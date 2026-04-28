"use client"

import { motion } from "framer-motion"

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center text-center text-white overflow-hidden">

      {/* 🎥 VIDEO BACKGROUND */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src="/video.mp4" type="video/mp4" />
      </video>

      {/* 🌑 OVERLAY (clave para que se lea el texto) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#020617]/90 via-black/70 to-[#0B1120]/75"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.32),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(239,68,68,0.2),transparent_45%)]" />

      {/* 🧠 CONTENIDO */}
      <div className="relative z-10 max-w-4xl px-6">

        {/* 🔥 HOOK */}
        <motion.h1
          className="mb-6 text-4xl font-bold leading-tight text-slate-100 md:text-6xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Deja de adivinar el mercado y empieza a entenderlo
        </motion.h1>

        {/* 💥 SUBTEXTO */}
        <motion.p
          className="mb-8 text-lg text-slate-300 md:text-xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Aprende a leer gráficos, tomar decisiones reales y operar con confianza
          en sesiones en vivo.
        </motion.p>

        {/* 💰 CTA */}
        <motion.a
          href="/login"
          className="inline-block rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,0.4)] transition hover:scale-105 hover:brightness-110"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          🚀 Empezar ahora
        </motion.a>

        {/* 🧲 PRUEBA SOCIAL */}
        <p className="mt-4 text-sm text-slate-400">
          +100 estudiantes ya están aprendiendo en vivo
        </p>

      </div>

    </section>
  )
}