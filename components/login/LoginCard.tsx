"use client"

import LoginTabs from "./LoginTabs"
import PurchaseForm from "./PurchaseForm"
import AccessForm from "./AccessForm"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

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
    const [showForm, setShowForm] = useState(true)

    useEffect(() => {
        if (!startOnAccessTab) return
        setMode("access")
        setShowForm(true)
    }, [startOnAccessTab, setMode])

    return (
        <div className="w-full max-w-md space-y-4">

            {/* 🔥 TITLE */}
            <h1 className="text-2xl font-bold text-gray-900">
                Smart Option Academy
            </h1>

            {/* 🔥 SUBTEXT */}
            <p className="text-gray-500">
                {mode === "buy"
                    ? "Accede a las sesiones en vivo"
                    : "Ingresa tu código de acceso"}
            </p>

            {/* 🔥 TABS */}
            <LoginTabs
                mode={mode}
                setMode={(value) => {
                    setMode(value)
                    setShowForm(true)
                }}
            />

            {/* 🔥 FORM (ANIMADO) */}
            {showForm && (
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
            )}


            {/* 🔥 CTA EXTRA */}
            <p className="text-sm text-gray-500 text-center pt-2">
                ¿Aún no tienes acceso?{" "}
                <span
                    onClick={() => setMode("buy")}
                    className="text-green-600 font-semibold cursor-pointer"
                >
                    Obtener acceso
                </span>
            </p>

        </div>
    )
}