"use client"

import dashboardTheme from "@/components/dashboard/dashboardTheme.module.css"

type TopTickerProps = {
    line: string
    joinHref: string
    isLive: boolean
}

export default function TopTicker({ line, joinHref, isLive }: TopTickerProps) {
    return (
        <div className={dashboardTheme.contentMax} style={{ paddingTop: "var(--ds-4)", paddingBottom: "var(--ds-2)" }}>
            <p
                style={{
                    color: "var(--ds-text-muted)",
                    margin: "0 0 var(--ds-3)",
                    lineHeight: 1.55,
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                }}
            >
                Revisa tus sesiones y reserva tu cupo sin perder tiempo.
            </p>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--ds-3)",
                    minHeight: 52,
                    padding: "var(--ds-2) var(--ds-3)",
                    borderRadius: "var(--ds-r-md)",
                    background: "var(--ds-surface)",
                    border: "1px solid var(--ds-border)",
                    boxShadow: "var(--ds-shadow-card)",
                }}
            >
                <p
                    style={{
                        margin: 0,
                        color: "var(--ds-text)",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        lineHeight: 1.4,
                        flex: "1 1 auto",
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title={line}
                >
                    {line}
                </p>
                <a
                    href={joinHref}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: isLive
                            ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                            : "linear-gradient(135deg, var(--ds-accent), #2563eb)",
                        color: "#fff",
                        textDecoration: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "var(--ds-r-full)",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        boxShadow: "var(--ds-shadow-sm)",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
                        whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)"
                        e.currentTarget.style.filter = "brightness(1.05)"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.filter = "none"
                    }}
                >
                    Unirse
                </a>
            </div>
        </div>
    )
}
