"use client"

import { ReactNode } from "react"

type FeatureCardProps = {
    title: string
    icon: ReactNode
    accent: string
    accentSolid: string
}

export default function FeatureCard({ title, icon, accent, accentSolid }: FeatureCardProps) {
    return (
        <div
            style={{
                background: "var(--ds-elevated)",
                padding: "var(--ds-4)",
                borderRadius: "var(--ds-r-md)",
                color: "var(--ds-text)",
                border: "1px solid var(--ds-border)",
                cursor: "pointer",
                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
                boxShadow: "var(--ds-shadow-card)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)"
                e.currentTarget.style.boxShadow = `var(--ds-shadow-sm), 0 12px 40px ${accent}`
                e.currentTarget.style.borderColor = accentSolid
                e.currentTarget.style.background = "var(--ds-surface-hover)"
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "var(--ds-shadow-card)"
                e.currentTarget.style.borderColor = "var(--ds-border)"
                e.currentTarget.style.background = "var(--ds-elevated)"
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--ds-2)", marginBottom: "var(--ds-2)" }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--ds-r-sm)",
                        background: "var(--ds-surface)",
                        border: "1px solid var(--ds-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ds-text-secondary)",
                    }}
                >
                    {icon}
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 600, textAlign: "left" }}>{title}</div>
            </div>
            <div style={{ color: "var(--ds-text-muted)", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                {title === "Estrategias"
                    ? "Rutinas para operar con claridad."
                    : title === "Clases"
                      ? "Contenido guiado en vivo."
                      : title === "Análisis"
                        ? "Herramientas y revisiones del mercado."
                        : "Conecta y comparte con otros estudiantes."}
            </div>
        </div>
    )
}
