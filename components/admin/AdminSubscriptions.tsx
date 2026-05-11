"use client"

import { useCallback, useEffect, useState } from "react"

type Row = {
    id: string
    email: string
    subscription_id: string | null
    subscription_status: string | null
    access_type: string | null
}

export default function AdminSubscriptions() {
    const [rows, setRows] = useState<Row[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/trading-students", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => [])) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: unknown })?.error === "string"
                        ? (payload as { error: string }).error
                        : "Failed to load"
                throw new Error(msg)
            }
            const list = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
            setRows(
                list.map((r) => ({
                    id: typeof r.id === "string" ? r.id : "",
                    email: typeof r.email === "string" ? r.email : "",
                    subscription_id:
                        typeof r.subscription_id === "string" && r.subscription_id.trim()
                            ? r.subscription_id.trim()
                            : null,
                    subscription_status:
                        typeof r.subscription_status === "string" && r.subscription_status.trim()
                            ? r.subscription_status.trim()
                            : null,
                    access_type: typeof r.access_type === "string" ? r.access_type : null,
                }))
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error loading subscriptions")
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    return (
        <div className="space-y-6 text-[#e5e7eb]">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">Subscriptions</h2>
                <p className="mt-1 text-sm text-slate-400">Stripe-linked status per student (read-only here).</p>
            </header>

            <section
                style={{
                    border: "1px solid rgba(59,130,246,0.25)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    borderRadius: 16,
                    boxShadow: "0 20px 30px -20px rgba(37,99,235,0.35)",
                    overflow: "hidden",
                }}
            >
                {loading ? (
                    <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>Loading…</p>
                ) : error ? (
                    <p style={{ margin: 0, padding: "16px", color: "#f87171" }}>{error}</p>
                ) : rows.length === 0 ? (
                    <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>No students found.</p>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                            <thead>
                                <tr style={{ background: "rgba(15,23,42,0.7)" }}>
                                    {["Email", "Access", "Status", "Subscription ID"].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                textAlign: "left",
                                                padding: "12px 14px",
                                                color: "#cbd5e1",
                                                fontSize: "0.75rem",
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                borderBottom: "1px solid rgba(59,130,246,0.2)",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.id || r.email}
                                        style={{ borderBottom: "1px solid rgba(148,163,184,0.1)" }}
                                    >
                                        <td
                                            style={{
                                                padding: "12px 14px",
                                                color: "#e5e7eb",
                                                fontSize: "0.875rem",
                                                wordBreak: "break-all",
                                            }}
                                        >
                                            {r.email}
                                        </td>
                                        <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.875rem" }}>
                                            {r.access_type ?? "—"}
                                        </td>
                                        <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.875rem" }}>
                                            {r.subscription_status ?? "—"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 14px",
                                                color: "#64748b",
                                                fontSize: "0.75rem",
                                                fontFamily: "ui-monospace, monospace",
                                                wordBreak: "break-all",
                                            }}
                                        >
                                            {r.subscription_id ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
