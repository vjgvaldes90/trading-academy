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
                        Smart Option Academy: educación financiera elite en vivo
                    </h2>

                    <p className="mb-10 text-lg text-slate-300">
                        Opciones, stocks y ETFs con metodología profesional, análisis técnico y gestión de riesgo frente al mercado en tiempo real.
                    </p>

                    <div className="space-y-4 text-slate-300">

                        <p>✔ Mentoría en vivo: opciones, stocks y ETFs</p>
                        <p>✔ Análisis técnico y lectura del mercado en tiempo real</p>
                        <p>✔ Estructura de alto rendimiento y gestión del riesgo</p>
                        <p>✔ Metodología profesional repetible paso a paso</p>
                        <p>✔ Acceso privado para cohortes enfocadas en excelencia</p>

                    </div>
                </div>

                {/* RIGHT SIDE (CARD) */}
                <div className="relative">

                    {/* GLOW */}
                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20"></div>

                    <div className="relative rounded-2xl border border-blue-400/20 bg-[#0B1220]/95 p-10 text-center shadow-[0_24px_52px_rgba(2,6,23,0.55)]">

                        {/* BADGE */}
                        <div className="mb-4">
                            <span className="rounded-full bg-blue-500/20 px-4 py-1 text-sm text-blue-300">
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
                            Educación financiera premium frente al mercado, sin atajos
                        </p>

                        {/* CTA */}
                        <a
                            href="/login"
                            className="block w-full rounded-xl border border-blue-300/25 bg-gradient-to-r from-blue-500 to-blue-700 py-4 text-lg font-bold text-white shadow-[0_14px_34px_rgba(37,99,235,0.35)] transition hover:scale-105 hover:brightness-110"
                        >
                            Comienza tu formación
                        </a>

                        {/* MICRO COPY */}
                        <p className="mt-6 text-sm text-slate-500">
                            Sin contratos • Cancela cuando quieras
                        </p>

                    </div>
                </div>

            </div>
        </motion.section>
    )
}