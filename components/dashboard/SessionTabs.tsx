"use client"

import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"
import { useSession } from "@/context/SessionContext"

export type TabKey = "today" | "thisWeek" | "nextWeek"

function TabButton({
    label,
    active,
    onClick,
}: {
    label: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: "0.625rem 1rem",
                borderRadius: "var(--ds-r-full)",
                border: active ? "1px solid var(--ds-accent-muted)" : "1px solid var(--ds-border)",
                background: active ? "var(--ds-accent-muted)" : "var(--ds-surface)",
                color: active ? "var(--ds-text)" : "var(--ds-text-secondary)",
                fontWeight: 600,
                fontSize: "0.8125rem",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease",
                boxShadow: active ? "var(--ds-shadow-card)" : "none",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "var(--ds-shadow-sm)"
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = active ? "var(--ds-shadow-card)" : "none"
            }}
        >
            {label}
        </button>
    )
}

export default function SessionTabs() {
    const { activeTab, setActiveTab } = useSession()

    return (
        <div className={dashboardTheme.contentMax} style={{ paddingTop: "var(--ds-3)", paddingBottom: "var(--ds-3)" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "var(--ds-2)",
                    flexWrap: "wrap",
                    marginBottom: "var(--ds-3)",
                }}
            >
                <p style={{ color: "var(--ds-text)", margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>Agenda</p>
                <p style={{ color: "var(--ds-text-muted)", margin: 0, fontSize: "0.8125rem" }}>
                    Elige un rango para ver tus sesiones.
                </p>
            </div>

            <div style={{ display: "flex", gap: "var(--ds-2)", flexWrap: "wrap" }}>
                <TabButton label="Hoy" active={activeTab === "today"} onClick={() => setActiveTab("today")} />
                <TabButton
                    label="Esta semana"
                    active={activeTab === "thisWeek"}
                    onClick={() => setActiveTab("thisWeek")}
                />
                <TabButton
                    label="Próxima semana"
                    active={activeTab === "nextWeek"}
                    onClick={() => setActiveTab("nextWeek")}
                />
            </div>
        </div>
    )
}
