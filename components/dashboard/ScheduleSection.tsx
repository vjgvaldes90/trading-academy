"use client"

import { useSession } from "@/context/SessionContext"
import SessionList from "./SessionList"
import TradingActivity from "./TradingActivity"

export default function ScheduleSection() {
    const { filteredSessions, showTradingActivity } = useSession()

    if (filteredSessions.length === 0) {
        return (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                    style={{
                        background: "var(--ds-surface)",
                        border: "1px solid var(--ds-border)",
                        borderRadius: "var(--ds-r-md)",
                        padding: "var(--ds-4)",
                        color: "var(--ds-text-muted)",
                        fontSize: "0.8125rem",
                        flexShrink: 0,
                        boxShadow: "var(--ds-shadow-card)",
                    }}
                >
                    No hay sesiones en este rango.
                </div>
                {showTradingActivity && (
                    <div style={{ flexShrink: 0 }}>
                        <TradingActivity compact />
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ height: "100%" }}>
                <SessionList sessions={filteredSessions} />
            </div>
            {showTradingActivity && (
                <div style={{ flexShrink: 0 }}>
                    <TradingActivity compact />
                </div>
            )}
        </>
    )
}
