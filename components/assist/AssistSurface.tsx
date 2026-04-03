"use client"

import { useLearningAssist } from "@/hooks/useLearningAssist"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"

/** UI desacoplada; reglas y textos viven en `lib/assist`. */
export default function AssistSurface() {
    const { activeSuggestion, dismissCurrent, openHelp, closeHelp, isHelpPanelOpen } = useLearningAssist()

    return (
        <div
            style={{
                position: "fixed",
                right: 18,
                bottom: 18,
                zIndex: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 10,
                maxWidth: 360,
                pointerEvents: "none",
            }}
        >
            <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <button
                    type="button"
                    onClick={() => (isHelpPanelOpen ? closeHelp() : openHelp())}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.25)",
                        background: "rgba(15,23,42,0.85)",
                        color: "#e2e8f0",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
                        backdropFilter: "blur(10px)",
                    }}
                >
                    ¿Necesitas ayuda?
                </button>

                <AnimatePresence>
                    {isHelpPanelOpen && (
                        <motion.aside
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.22 }}
                            style={{
                                padding: "14px 16px",
                                borderRadius: 14,
                                background: "rgba(15,23,42,0.92)",
                                border: "1px solid rgba(59,130,246,0.25)",
                                boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
                                color: "#cbd5e1",
                                fontSize: 13,
                                lineHeight: 1.5,
                            }}
                        >
                            <p style={{ margin: "0 0 8px 0", fontWeight: 800, color: "#f8fafc" }}>Centro de ayuda</p>
                            <p style={{ margin: "0 0 12px 0" }}>
                                Pronto podrás chatear con un tutor asistente. Mientras tanto, revisa la agenda o tu acceso
                                al curso.
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <Link
                                    href="#weekly-schedule"
                                    onClick={closeHelp}
                                    style={{
                                        fontWeight: 800,
                                        color: "#93c5fd",
                                        textDecoration: "none",
                                        fontSize: 12,
                                    }}
                                >
                                    Ir a agenda
                                </Link>
                                <Link
                                    href="/#pricing"
                                    onClick={closeHelp}
                                    style={{
                                        fontWeight: 800,
                                        color: "#93c5fd",
                                        textDecoration: "none",
                                        fontSize: 12,
                                    }}
                                >
                                    Comprar acceso
                                </Link>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {activeSuggestion && !isHelpPanelOpen ? (
                    <motion.div
                        key={activeSuggestion.id}
                        role="status"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.24 }}
                        style={{
                            pointerEvents: "auto",
                            padding: "12px 14px",
                            borderRadius: 14,
                            background: "rgba(15,23,42,0.88)",
                            border: "1px solid rgba(148,163,184,0.18)",
                            boxShadow: "0 10px 32px rgba(0,0,0,0.28)",
                            backdropFilter: "blur(12px)",
                            maxWidth: 320,
                        }}
                    >
                        <p style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>
                            {activeSuggestion.title}
                        </p>
                        <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#94a3b8", lineHeight: 1.45 }}>
                            {activeSuggestion.body}
                        </p>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={dismissCurrent}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: "rgba(148,163,184,0.12)",
                                    color: "#94a3b8",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                }}
                            >
                                Ahora no
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    openHelp()
                                    dismissCurrent()
                                }}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: "linear-gradient(90deg,#2563eb,#1d4ed8)",
                                    color: "white",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                }}
                            >
                                Ver ayuda
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    )
}
