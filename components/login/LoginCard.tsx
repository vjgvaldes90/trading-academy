"use client"

import LoginTabs from "./LoginTabs"
import PurchaseForm from "./PurchaseForm"
import AccessForm from "./AccessForm"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"

export type LoginMode = "buy" | "access"

type LoginCardProps = {
    mode: LoginMode
    setMode: (value: LoginMode) => void
    email: string
    setEmail: (value: string) => void
    code: string
    setCode: (value: string) => void
    handleAccess: () => void | Promise<void>
    accessError?: string | null
    onClearAccessError?: () => void
    /** Desde email CTA: `/login?redirect=...` — mostrar ya el formulario de código */
    startOnAccessTab?: boolean
}

export default function LoginCard({
    mode,
    setMode,
    email,
    setEmail,
    code,
    setCode,
    handleAccess,
    accessError,
    onClearAccessError,
    startOnAccessTab = false,
}: LoginCardProps) {
    useEffect(() => {
        if (!startOnAccessTab) return
        setMode("access")
    }, [startOnAccessTab, setMode])

    return (
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-blue-400/20 bg-[#0B1220]/85 p-7 shadow-[0_28px_68px_rgba(2,6,23,0.7)] backdrop-blur-2xl">

            {/* 🔥 TITLE */}
            <h1 className="text-2xl font-bold text-slate-100">
                Smart Option Academy
            </h1>

            {/* 🔥 SUBTEXT */}
            <p className="text-slate-300">
                {mode === "buy"
                    ? "Accede a mentoría institucional"
                    : "Ingresa al ecosistema Smart Option Academy"}
            </p>

            {/* 🔥 TABS */}
            <LoginTabs
                mode={mode}
                setMode={(value) => {
                    setMode(value)
                }}
            />

            {/* 🔥 FORM (ANIMADO) */}
            <AnimatePresence mode="wait">

                {mode === "buy" && (
                    <motion.div
                        key="buy"
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -25 }}
                        transition={{ duration: 0.3 }}
                    >
                        <PurchaseForm email={email} setEmail={setEmail} />
                    </motion.div>
                )}

                {mode === "access" && (
                    <motion.div
                        key="access"
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -25 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AccessForm
                            code={code}
                            setCode={setCode}
                            handleAccess={handleAccess}
                            error={accessError}
                            onClearError={onClearAccessError}
                        />
                    </motion.div>
                )}

            </AnimatePresence>


            {/* 🔥 CTA EXTRA */}
            <p className="pt-2 text-center text-sm text-slate-400">
                ¿Aún no tienes acceso?{" "}
                <span
                    onClick={() => setMode("buy")}
                    className="cursor-pointer font-semibold text-blue-300"
                >
                    Obtener acceso
                </span>
            </p>

        </div>
    )
}