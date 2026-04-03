"use client"

type ResourceItem = { id: string; label: string; kind: "video" | "pdf" }

/** Sustituir por datos reales (CMS / Supabase) cuando existan. */
const RESOURCES: ResourceItem[] = []

export default function ResourcesSection() {
    return (
        <section aria-labelledby="recursos-title">
            <h2
                id="recursos-title"
                style={{
                    margin: "0 0 var(--ds-3)",
                    color: "var(--ds-text)",
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                }}
            >
                📚 Recursos
            </h2>

            {RESOURCES.length === 0 ? (
                <p style={{ margin: 0, color: "var(--ds-text-muted)", fontSize: "0.875rem", lineHeight: 1.5 }}>
                    No hay recursos disponibles aún
                </p>
            ) : (
                <ul
                    style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--ds-2)",
                    }}
                >
                    {RESOURCES.map((r) => (
                        <li
                            key={r.id}
                            style={{
                                padding: "var(--ds-3)",
                                borderRadius: 12,
                                border: "1px solid var(--ds-border)",
                                background: "var(--ds-surface)",
                                boxShadow: "var(--ds-shadow-card)",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "var(--ds-text)",
                            }}
                        >
                            {r.kind === "video" ? "Video: " : "PDF: "}
                            {r.label}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
