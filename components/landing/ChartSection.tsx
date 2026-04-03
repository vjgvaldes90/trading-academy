"use client"

import { motion } from "framer-motion"
import TradingChart from "@/components/TradingChart"
import { useRouter } from "next/navigation"

export default function ChartSection() {
    return (
        <motion.section
            className="bg-black py-24 text-white"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="max-w-6xl mx-auto px-8 text-center">

                {/* 🔥 PRE-TEXTO (autoridad) */}
                <p className="text-blue-500 font-semibold mb-2">
                    Método probado en mercado real
                </p>

                {/* 🧠 HEADLINE */}
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                    Aprende a leer el mercado como un profesional
                </h2>

                {/* 💬 SUBTEXTO */}
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
                    De principiante a rentable en semanas usando estrategias reales, no teoría.
                </p>

                {/* 💰 CTA */}
                <a
                    href="/login"
                    className="mb-12 inline-block bg-green-500 text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-green-400 transition transform hover:scale-105"
                >
                    🚀 Empezar ahora
                </a>

                {/* 📈 CHART */}
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <TradingChart />
                </div>

            </div>
        </motion.section>
    )
}