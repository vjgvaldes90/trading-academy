"use client"

import { motion } from "framer-motion"
import type { LoginMode } from "./LoginCard"

type LoginTabsProps = {
    mode: LoginMode
    setMode: (value: LoginMode) => void
}

export default function LoginTabs({ mode, setMode }: LoginTabsProps) {
    return (
        <div className="relative grid grid-cols-2 w-full bg-gray-100 rounded-lg p-1">

            {/* 🔥 FONDO ANIMADO (estable) */}
            <motion.div
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-green-500 rounded-md pointer-events-none"
                animate={{
                    x: mode === "buy" ? 0 : "100%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* BOTÓN BUY */}
            <button
                onClick={() => setMode("buy")}
                className={`py-2 text-sm font-semibold z-10 transition ${mode === "buy" ? "text-black" : "text-gray-600"
                    }`}
            >
                Comprar acceso
            </button>

            {/* BOTÓN ACCESS */}
            <button
                onClick={() => setMode("access")}
                className={`py-2 text-sm font-semibold z-10 transition ${mode === "access" ? "text-black" : "text-gray-600"
                    }`}
            >
                Ya tengo código
            </button>

        </div>
    )
}