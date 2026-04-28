"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export default function Instructor() {
    return (
        <motion.section
            className="bg-[#020617] py-24 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center">

                {/* 📸 IMAGEN */}
                <div className="flex justify-center">
                    <Image
                        src="/toni.png" // luego cambias esto
                        alt="Tony Linares"
                        width={350}
                        height={420}
                        className="w-[350px] rounded-2xl border border-blue-400/20 object-cover shadow-[0_25px_55px_rgba(2,6,23,0.65)]"
                    />
                </div>

                {/* 🧠 CONTENIDO */}
                <div>

                    <p className="mb-2 font-semibold text-blue-400">
                        Instructor de Smart Option Academy
                    </p>

                    <h2 className="mb-6 text-4xl font-bold text-slate-100">
                        Aprende directamente con Tony Linares
                    </h2>

                    <p className="mb-4 text-lg text-slate-300">
                        Tony opera el mercado de forma activa y enseña exactamente cómo toma decisiones en tiempo real.
                    </p>

                    <p className="mb-4 text-lg text-slate-300">
                        No es teoría complicada — es un enfoque práctico donde ves el análisis, las entradas y la gestión del riesgo paso a paso.
                    </p>

                    <p className="text-lg text-slate-300">
                        Durante las sesiones en vivo podrás hacer preguntas y aprender directamente cómo pensar como un trader profesional.
                    </p>

                    {/* 💰 CTA */}
                    <a
                        href="/login"
                        className="mt-6 inline-block rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)] transition hover:brightness-110"
                    >
                        🚀 Aprender con Tony
                    </a>

                </div>

            </div>
        </motion.section>
    )
}