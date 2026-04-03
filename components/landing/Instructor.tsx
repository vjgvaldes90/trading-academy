"use client"

import { motion } from "framer-motion"

export default function Instructor() {
    return (
        <motion.section
            className="bg-white py-24"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center">

                {/* 📸 IMAGEN */}
                <div className="flex justify-center">
                    <img
                        src="/toni.png" // luego cambias esto
                        alt="Tony Linares"
                        className="rounded-2xl shadow-xl w-[350px] object-cover"
                    />
                </div>

                {/* 🧠 CONTENIDO */}
                <div>

                    <p className="text-green-500 font-semibold mb-2">
                        Instructor de Smart Option Academy
                    </p>

                    <h2 className="text-4xl font-bold mb-6 text-gray-900">
                        Aprende directamente con Tony Linares
                    </h2>

                    <p className="text-lg mb-4 text-gray-700">
                        Tony opera el mercado de forma activa y enseña exactamente cómo toma decisiones en tiempo real.
                    </p>

                    <p className="text-lg mb-4 text-gray-700">
                        No es teoría complicada — es un enfoque práctico donde ves el análisis, las entradas y la gestión del riesgo paso a paso.
                    </p>

                    <p className="text-lg text-gray-700">
                        Durante las sesiones en vivo podrás hacer preguntas y aprender directamente cómo pensar como un trader profesional.
                    </p>

                    {/* 💰 CTA */}
                    <a
                        href="/login"
                        className="inline-block mt-6 bg-green-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-green-400 transition"
                    >
                        🚀 Aprender con Tony
                    </a>

                </div>

            </div>
        </motion.section>
    )
}