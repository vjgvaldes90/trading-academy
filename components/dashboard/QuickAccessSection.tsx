"use client"

import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import { BarChart3, GraduationCap, MessageCircle, TrendingUp } from "lucide-react"
import FeatureCard from "./FeatureCard"

export default function QuickAccessSection() {
    return (
        <div className={dashboardTheme.contentMax} style={{ paddingTop: "var(--ds-4)", paddingBottom: "var(--ds-4)" }}>
            <div
                style={{
                    color: "var(--ds-text-muted)",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "var(--ds-3)",
                }}
            >
                Accesos rápidos
            </div>
            <section>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "var(--ds-3)",
                    }}
                >
                    <FeatureCard
                        icon={<TrendingUp size={20} />}
                        title="Estrategias"
                        accent="rgba(37,99,235,0.35)"
                        accentSolid="rgb(37,99,235)"
                    />
                    <FeatureCard
                        icon={<GraduationCap size={20} />}
                        title="Clases"
                        accent="rgba(16,185,129,0.32)"
                        accentSolid="rgb(16,185,129)"
                    />
                    <FeatureCard
                        icon={<BarChart3 size={20} />}
                        title="Análisis"
                        accent="rgba(245,158,11,0.28)"
                        accentSolid="rgb(245,158,11)"
                    />
                    <FeatureCard
                        icon={<MessageCircle size={20} />}
                        title="Comunidad"
                        accent="rgba(236,72,153,0.22)"
                        accentSolid="rgb(236,72,153)"
                    />
                </div>
            </section>
        </div>
    )
}
