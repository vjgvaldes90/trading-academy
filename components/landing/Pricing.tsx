"use client"

import { motion } from "framer-motion"

export default function Pricing() {
    return (
        <motion.section
            id="pricing"
            className="bg-[#020617] py-32 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center">

                {/* LEFT SIDE */}
                <div>
                    <h2 className="text-5xl font-bold mb-6">
                        De principiante a trader rentable con sesiones en vivo
                    </h2>

                    <p className="text-gray-400 mb-10 text-lg">
                        Aprende viendo operaciones reales, toma decisiones con confianza
                        y mejora tu rendimiento con mentoría directa.
                    </p>

                    <div className="space-y-4 text-gray-300">

                        <p>✔ Sesiones en vivo 3 veces por semana</p>
                        <p>✔ Análisis en tiempo real</p>
                        <p>✔ Estrategias profesionales</p>
                        <p>✔ Mentoría directa</p>
                        <p>✔ Comunidad privada</p>

                    </div>
                </div>

                {/* RIGHT SIDE (CARD) */}
                <div className="relative">

                    {/* GLOW */}
                    <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20"></div>

                    <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl p-10 text-center">

                        {/* BADGE */}
                        <div className="mb-4">
                            <span className="bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-sm">
                                🔥 Acceso limitado
                            </span>
                        </div>

                        {/* ANCLA DE PRECIO */}
                        <p className="text-gray-500 line-through mb-2">
                            Valor real $399/mes
                        </p>

                        {/* PRECIO */}
                        <div className="mb-4">
                            <span className="text-6xl font-bold">$150</span>
                            <span className="text-gray-400 text-lg ml-2">/ mes</span>
                        </div>

                        {/* URGENCIA */}
                        <p className="text-red-400 text-sm mb-4">
                            ⚠️ Cupos limitados para mantener calidad en las sesiones
                        </p>

                        {/* SUBTEXTO MEJORADO */}
                        <p className="text-gray-400 mb-8">
                            Accede a sesiones en vivo, estrategias reales y mentoría directa
                        </p>

                        {/* CTA */}
                        <a
                            href="/login"
                            className="block w-full bg-green-500 text-black py-4 rounded-xl text-lg font-bold hover:bg-green-400 transition transform hover:scale-105"
                        >
                            🚀 Empezar ahora
                        </a>

                        {/* MICRO COPY */}
                        <p className="text-sm text-gray-500 mt-6">
                            Sin contratos • Cancela cuando quieras
                        </p>

                    </div>
                </div>

            </div>
        </motion.section>
    )
}