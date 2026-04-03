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
            className="bg-white py-24"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 text-center">

                {/* 🔥 TITULO */}
                <h2 className="text-4xl font-bold mb-4 text-gray-900">
                    Resultados reales de estudiantes reales
                </h2>

                {/* 💬 SUBTEXTO */}
                <p className="text-gray-600 mb-12">
                    Esto es lo que están logrando después de aplicar el método
                </p>

                {/* 🧱 GRID */}
                <div className="grid md:grid-cols-3 gap-8">

                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className="bg-gray-50 p-6 rounded-xl shadow hover:shadow-xl transition text-left"
                        >
                            <p className="text-gray-700 mb-4">“{t.text}”</p>

                            <p className="font-semibold text-gray-900">
                                {t.name}
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