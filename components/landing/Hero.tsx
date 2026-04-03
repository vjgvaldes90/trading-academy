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
      <div className="absolute inset-0 bg-black/70"></div>

      {/* 🧠 CONTENIDO */}
      <div className="relative z-10 max-w-4xl px-6">

        {/* 🔥 HOOK */}
        <motion.h1
          className="text-4xl md:text-6xl font-bold leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Deja de adivinar el mercado y empieza a entenderlo
        </motion.h1>

        {/* 💥 SUBTEXTO */}
        <motion.p
          className="text-lg md:text-xl text-gray-300 mb-8"
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
          className="inline-block bg-green-500 text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-green-400 transition transform hover:scale-105"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          🚀 Empezar ahora
        </motion.a>

        {/* 🧲 PRUEBA SOCIAL */}
        <p className="text-sm text-gray-400 mt-4">
          +100 estudiantes ya están aprendiendo en vivo
        </p>

      </div>

    </section>
  )
}