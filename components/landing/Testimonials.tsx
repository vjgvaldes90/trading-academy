"use client"

import { motion } from "framer-motion"

const testimonials = [
    {
        name: "Carlos M.",
        text: "Antes no entendía nada del mercado. Ahora sé exactamente cuándo entrar y salir.",
    },
    {
        name: "Luis G.",
        text: "Las sesiones en vivo cambian todo. Ves cómo se toman decisiones reales.",
    },
    {
        name: "Andrea R.",
        text: "Recuperé lo que había perdido aprendiendo a gestionar el riesgo correctamente.",
    },
]

export default function Testimonials() {
    return (
        <motion.section
            className="bg-[#030712] py-24 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 text-center">

                {/* 🔥 TITULO */}
                <h2 className="mb-4 text-4xl font-bold text-slate-100">
                    Resultados reales de estudiantes reales
                </h2>

                {/* 💬 SUBTEXTO */}
                <p className="mb-12 text-slate-300">
                    Esto es lo que están logrando después de aplicar el método
                </p>

                {/* 🧱 GRID */}
                <div className="grid md:grid-cols-3 gap-8">

                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-blue-400/20 bg-[#0B1220]/90 p-6 text-left shadow-[0_18px_40px_rgba(2,6,23,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(30,64,175,0.28)]"
                        >
                            <p className="mb-4 text-slate-300">“{t.text}”</p>

                            <p className="font-semibold text-slate-100">
                                {t.name}
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