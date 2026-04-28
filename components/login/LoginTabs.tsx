"use client"

import { motion } from "framer-motion"
import type { LoginMode } from "./LoginCard"

type LoginTabsProps = {
    mode: LoginMode
    setMode: (value: LoginMode) => void
}

export default function LoginTabs({ mode, setMode }: LoginTabsProps) {
    return (
        <div className="relative grid w-full grid-cols-2 rounded-xl border border-blue-400/20 bg-[#0A1222] p-1">

            {/* 🔥 FONDO ANIMADO (estable) */}
            <motion.div
                className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
                animate={{
                    x: mode === "buy" ? 0 : "100%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* BOTÓN BUY */}
            <button
                onClick={() => setMode("buy")}
                className={`z-10 py-2 text-sm font-semibold transition ${mode === "buy" ? "text-white" : "text-slate-400"
                    }`}
            >
                Comprar acceso
            </button>

            {/* BOTÓN ACCESS */}
            <button
                onClick={() => setMode("access")}
                className={`z-10 py-2 text-sm font-semibold transition ${mode === "access" ? "text-white" : "text-slate-400"
                    }`}
            >
                Ya tengo código
            </button>

        </div>
    )
}