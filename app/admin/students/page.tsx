"use client"

import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type TradingStudentListRow = {
    id: string
    email: string
    access_type: string | null
    is_active: boolean | null
    subscription_id: string | null
    subscription_status: string | null
}

type RefundModalTarget = {
    userId: string
    refundDisplay: string
}

/** PATCH body must use values accepted by `/api/admin/students/[email]`. */
const ACCESS_TYPE_OPTIONS = ["paid", "free", "vip", "discount", "discounted"] as const

function studentPathEmail(email: string): string {
    return encodeURIComponent(email.trim().toLowerCase())
}

export default function AdminStudentsPage() {
    const [rows, setRows] = useState<TradingStudentListRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busyEmail, setBusyEmail] = useState<string | null>(null)
    const [refundModal, setRefundModal] = useState<RefundModalTarget | null>(null)
    const [busyRefundUserId, setBusyRefundUserId] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/admin/trading-students", { cache: "no-store" })
            const payload = (await res.json().catch(() => [])) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: unknown })?.error === "string"
                        ? (payload as { error: string }).error
                        : "Failed to load students"
                throw new Error(msg)
            }
            const list = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
            setRows(
                list.map((r) => ({
                    id: typeof r.id === "string" ? r.id : "",
                    email: typeof r.email === "string" ? r.email : "",
                    access_type: typeof r.access_type === "string" ? r.access_type : "paid",
                    is_active: r.is_active !== false,
                    subscription_id:
                        typeof r.subscription_id === "string" && r.subscription_id.trim()
                            ? r.subscription_id.trim()
                            : null,
                    subscription_status:
                        typeof r.subscription_status === "string" && r.subscription_status.trim()
                            ? r.subscription_status.trim()
                            : null,
                }))
            )
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error loading students")
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const patchStudent = async (email: string, body: Record<string, unknown>) => {
        const key = email.trim().toLowerCase()
        setBusyEmail(key)
        setError(null)
        try {
            const res = await fetch(`/api/admin/students/${studentPathEmail(email)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                cache: "no-store",
            })
            const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
            if (!res.ok) {
                const msg = typeof data.error === "string" ? data.error : "Update failed"
                throw new Error(msg)
            }
            const updated = data as {
                id?: string
                email?: string
                access_type?: string | null
                is_active?: boolean | null
            }
            setRows((prev) =>
                prev.map((r) =>
                    r.email.trim().toLowerCase() === key
                        ? {
                              ...r,
                              access_type:
                                  typeof updated.access_type === "string"
                                      ? updated.access_type
                                      : r.access_type,
                              is_active: updated.is_active !== false,
                          }
                        : r
                )
            )
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Update failed")
            await load()
        } finally {
            setBusyEmail(null)
        }
    }

    const openRefundPreview = async (row: TradingStudentListRow) => {
        if (!row.id) return
        setBusyRefundUserId(row.id)
        setError(null)
        try {
            const res = await fetch(
                `/api/admin/refund-preview?userId=${encodeURIComponent(row.id)}`,
                { cache: "no-store" }
            )
            const data = (await res.json().catch(() => ({}))) as {
                ok?: unknown
                refund_display?: string
                error?: string
            }
            if (!res.ok || data.ok !== true) {
                const msg =
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : "Could not load refund preview"
                throw new Error(msg)
            }
            const refundDisplay =
                typeof data.refund_display === "string" && data.refund_display.trim()
                    ? data.refund_display.trim()
                    : "$0.00"
            setRefundModal({ userId: row.id, refundDisplay })
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Could not load refund preview"
            setError(msg)
            alert(msg)
        } finally {
            setBusyRefundUserId(null)
        }
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#0B0F1A",
                color: "#e5e7eb",
                padding: "28px 20px",
            }}
        >
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <header
                    style={{
                        marginBottom: 18,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 14,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                    }}
                >
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>
                            Admin · Students
                        </h1>
                        <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: "0.95rem" }}>
                            Manage access type and activation. Changes apply immediately.
                        </p>
                    </div>
                    <Link
                        href="/admin"
                        style={{
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "1px solid rgba(59,130,246,0.35)",
                            color: "#93c5fd",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            textDecoration: "none",
                        }}
                    >
                        ← Sessions
                    </Link>
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
                            <CancelSessionConfirmModal
                                open={refundModal !== null}
                                title="Cancel subscription?"
                                description={
                                    refundModal
                                        ? `User will be removed immediately. Refund amount: ${refundModal.refundDisplay}`
                                        : ""
                                }
                                confirmText="Yes, cancel subscription"
                                onClose={() => setRefundModal(null)}
                                onConfirm={async () => {
                                    if (!refundModal) return
                                    const res = await fetch("/api/admin/cancel-subscription", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        cache: "no-store",
                                        body: JSON.stringify({ userId: refundModal.userId }),
                                    })
                                    const data = (await res.json().catch(() => ({}))) as {
                                        ok?: unknown
                                        error?: string
                                    }
                                    if (!res.ok || data.ok !== true) {
                                        const msg =
                                            typeof data.error === "string" && data.error.trim()
                                                ? data.error
                                                : "Cancel failed"
                                        throw new Error(msg)
                                    }
                                }}
                                onAfterConfirm={async () => {
                                    alert("Subscription cancelled successfully")
                                    await load()
                                }}
                            />
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                                <thead>
                                    <tr style={{ background: "rgba(15,23,42,0.7)" }}>
                                        {["Email", "Access type", "Active", "Actions"].map((h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    textAlign: h === "Actions" ? "right" : "left",
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
                                    {rows.map((r) => {
                                        const key = r.email.trim().toLowerCase()
                                        const busy = busyEmail === key
                                        const refundBusy = busyRefundUserId === r.id
                                        const active = r.is_active !== false
                                        const currentType = (r.access_type ?? "paid").toLowerCase()
                                        const showCancelRefund =
                                            Boolean(r.subscription_id) && r.subscription_status === "active"
                                        const baseOpts = [...ACCESS_TYPE_OPTIONS] as string[]
                                        const typeOptions = baseOpts.includes(currentType)
                                            ? baseOpts
                                            : [currentType, ...baseOpts]
                                        return (
                                            <tr key={r.id || key} style={{ borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
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
                                                <td style={{ padding: "10px 14px" }}>
                                                    <select
                                                        value={currentType}
                                                        disabled={busy || refundBusy}
                                                        onChange={(e) => {
                                                            const next = e.target.value
                                                            void patchStudent(r.email, { access_type: next })
                                                        }}
                                                        style={{
                                                            padding: "8px 10px",
                                                            borderRadius: 10,
                                                            border: "1px solid rgba(59,130,246,0.3)",
                                                            background: "rgba(15,23,42,0.9)",
                                                            color: "#f1f5f9",
                                                            fontSize: "0.8125rem",
                                                            minWidth: 140,
                                                            cursor: busy ? "wait" : "pointer",
                                                        }}
                                                    >
                                                        {typeOptions.map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: "0.875rem" }}>
                                                    {active ? "Yes" : "No"}
                                                </td>
                                                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                                                    <div
                                                        style={{
                                                            display: "inline-flex",
                                                            flexDirection: "column",
                                                            alignItems: "flex-end",
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <label
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: 10,
                                                                cursor: busy || refundBusy ? "wait" : "pointer",
                                                                userSelect: "none",
                                                            }}
                                                        >
                                                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                                {active ? "Active" : "Inactive"}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    position: "relative",
                                                                    width: 44,
                                                                    height: 24,
                                                                    borderRadius: 9999,
                                                                    background: active
                                                                        ? "linear-gradient(180deg, #22c55e 0%, #15803d 100%)"
                                                                        : "rgba(51,65,85,0.95)",
                                                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)",
                                                                    transition: "background 0.2s ease",
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={active}
                                                                    disabled={busy || refundBusy}
                                                                    onChange={() => {
                                                                        void patchStudent(r.email, {
                                                                            is_active: !active,
                                                                        })
                                                                    }}
                                                                    style={{
                                                                        position: "absolute",
                                                                        inset: 0,
                                                                        opacity: 0,
                                                                        width: "100%",
                                                                        height: "100%",
                                                                        cursor: busy || refundBusy ? "wait" : "pointer",
                                                                        margin: 0,
                                                                    }}
                                                                />
                                                                <span
                                                                    aria-hidden
                                                                    style={{
                                                                        position: "absolute",
                                                                        top: 3,
                                                                        left: active ? 22 : 3,
                                                                        width: 18,
                                                                        height: 18,
                                                                        borderRadius: "50%",
                                                                        background: "#f8fafc",
                                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                                                        transition: "left 0.2s ease",
                                                                    }}
                                                                />
                                                            </span>
                                                        </label>
                                                        {showCancelRefund ? (
                                                            <button
                                                                type="button"
                                                                disabled={busy || refundBusy}
                                                                onClick={() => void openRefundPreview(r)}
                                                                style={{
                                                                    padding: "8px 12px",
                                                                    borderRadius: 10,
                                                                    border: "1px solid rgba(248,113,113,0.45)",
                                                                    background: refundBusy
                                                                        ? "rgba(100,100,100,0.35)"
                                                                        : "#b91c1c",
                                                                    color: "#fff",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.75rem",
                                                                    cursor: busy || refundBusy ? "wait" : "pointer",
                                                                }}
                                                            >
                                                                {refundBusy ? "Loading…" : "Cancel + Refund"}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
