"use client"

import type { MyBooking } from "@/context/SessionContext"
import { useSession } from "@/context/SessionContext"

function sortBookings(a: MyBooking, b: MyBooking): number {
    const da = a.sessionDate ?? ""
    const db = b.sessionDate ?? ""
    if (da !== db) return da.localeCompare(db)
    return (a.sessionHour ?? "").localeCompare(b.sessionHour ?? "")
}

export default function MyBookingsSection() {
    const { myBookings } = useSession()
    const sorted = [...myBookings].sort(sortBookings)

    return (
        <section aria-labelledby="mis-reservas-title">
            <h2
                id="mis-reservas-title"
                style={{
                    margin: "0 0 var(--ds-3)",
                    color: "var(--ds-text)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                }}
            >
                Tus reservas
            </h2>
            <div
                style={{
                    borderRadius: 12,
                    padding: "var(--ds-4)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "0 20px 30px -20px rgba(59,130,246,0.25)",
                }}
            >
                {sorted.length === 0 ? (
                    <p
                        style={{
                            margin: 0,
                            textAlign: "center",
                            color: "var(--ds-text-muted)",
                            fontSize: "0.9375rem",
                            lineHeight: 1.5,
                        }}
                    >
                        No tienes sesiones reservadas
                    </p>
                ) : (
                    <ul
                        style={{
                            margin: 0,
                            padding: 0,
                            listStyle: "none",
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--ds-2)",
                        }}
                    >
                        {sorted.map((r) => (
                            <li
                                key={r.id}
                                style={{
                                    padding: "var(--ds-2) var(--ds-3)",
                                    borderRadius: 8,
                                    background: "rgba(15,23,42,0.7)",
                                    border: "1px solid rgba(59,130,246,0.2)",
                                    color: "#f8fafc",
                                    fontSize: "0.9375rem",
                                    fontWeight: 600,
                                }}
                            >
                                {(r.sessionDay ?? "—").trim()} · {(r.sessionHour ?? "—").trim()}
                                {r.sessionDate ? (
                                    <span
                                        style={{
                                            display: "block",
                                            marginTop: 4,
                                            fontSize: "0.75rem",
                                            fontWeight: 500,
                                            color: "var(--ds-text-muted)",
                                        }}
                                    >
                                        {r.sessionDate}
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}
