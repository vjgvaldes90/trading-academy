"use client"

import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import CreateStudentModal, {
    type CreateStudentFormValues,
} from "@/components/admin/CreateStudentModal"
import { useLanguage } from "@/context/LanguageProvider"
import { SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END } from "@/lib/subscriptionCancellation"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"
import { Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

type TradingStudentListRow = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    plan: string | null
    access_type: string | null
    is_active: boolean | null
    subscription_id: string | null
    subscription_status: string | null
}

type CancelModalTarget = {
    userId: string
}

/** PATCH body must use values accepted by `/api/admin/students/[email]`. */
const ACCESS_TYPE_OPTIONS = ["paid", "free", "vip", "discount", "discounted"] as const

function studentPathEmail(email: string): string {
    return encodeURIComponent(email.trim().toLowerCase())
}

function displayName(row: TradingStudentListRow): string {
    const first = typeof row.first_name === "string" ? row.first_name.trim() : ""
    const last = typeof row.last_name === "string" ? row.last_name.trim() : ""
    const full = `${first} ${last}`.trim()
    return full || "—"
}

function displayPhone(row: TradingStudentListRow): string {
    const phone = typeof row.phone === "string" ? row.phone.trim() : ""
    return phone || "—"
}

/** Normalize for client-side search (future server-side can reuse same rules). */
function normalizeStudentSearchText(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
}

function studentMatchesSearch(
    row: TradingStudentListRow,
    query: string,
    programDisplayText: string
): boolean {
    const q = normalizeStudentSearchText(query)
    if (!q) return true

    const first = typeof row.first_name === "string" ? row.first_name : ""
    const last = typeof row.last_name === "string" ? row.last_name : ""
    const planRaw = typeof row.plan === "string" ? row.plan : ""
    const planResolved = resolveSubscriptionPlan(row.plan)

    const haystack = normalizeStudentSearchText(
        [
            first,
            last,
            `${first} ${last}`.trim(),
            row.email,
            typeof row.phone === "string" ? row.phone : "",
            planRaw,
            planResolved,
            programDisplayText,
        ].join(" ")
    )

    return haystack.includes(q)
}

export default function AdminStudents() {
    const { t } = useLanguage()
    const [rows, setRows] = useState<TradingStudentListRow[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busyEmail, setBusyEmail] = useState<string | null>(null)
    const [cancelModal, setCancelModal] = useState<CancelModalTarget | null>(null)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({})
    const [revealingEmail, setRevealingEmail] = useState<string | null>(null)
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
    const [rotateTarget, setRotateTarget] = useState<TradingStudentListRow | null>(null)
    const [rotateResult, setRotateResult] = useState<{ email: string; code: string } | null>(null)
    const [rotateBusy, setRotateBusy] = useState(false)

    const programLabel = useCallback(
        (raw: string | null): { text: string; kind: "full" | "trading" | "other" } => {
            const plan = resolveSubscriptionPlan(raw)
            if (plan === "full_program") {
                return { text: t.pricingFullProgramName, kind: "full" }
            }
            if (plan === "trading_only") {
                return { text: t.pricingTradingOnlyName, kind: "trading" }
            }
            const fallback = typeof raw === "string" && raw.trim() ? raw.trim() : "—"
            return { text: fallback, kind: "other" }
        },
        [t]
    )

    const tableHeaders = useMemo(
        () => [
            t.adminStudentNameLabel,
            t.emailLabel,
            t.phoneLabel,
            t.adminProgramLabel,
            t.accessTypeLabel,
            t.activeLabel,
            t.adminAccessCodeLabel,
            t.actions,
        ],
        [t]
    )

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim()
        if (!q) return rows
        return rows.filter((row) => studentMatchesSearch(row, q, programLabel(row.plan).text))
    }, [rows, searchQuery, programLabel])

    const handleCreateStudent = async (values: CreateStudentFormValues) => {
        try {
            console.log("Submitting student...", values)
            const res = await fetch("/api/admin/students/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    phone: values.phone,
                    accessType: values.accessType,
                }),
            })
            console.log("HTTP Status:", res.status)
            const response = (await res.json().catch(() => ({}))) as {
                success?: boolean
                error?: string
                received?: unknown
            }
            console.log("API Response:", response)

            if (response.success === true) {
                console.log("Student payload accepted", response)
                setCreateModalOpen(false)
                await load()
                return
            }

            console.error(response.error)
        } catch (error) {
            console.error("Create student failed:", error)
        }
    }

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
                        : t.failedToLoadStudents
                throw new Error(msg)
            }
            const list = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
            setRows(
                list.map((r) => ({
                    id: typeof r.id === "string" ? r.id : "",
                    email: typeof r.email === "string" ? r.email : "",
                    first_name: typeof r.first_name === "string" ? r.first_name : null,
                    last_name: typeof r.last_name === "string" ? r.last_name : null,
                    phone: typeof r.phone === "string" ? r.phone : null,
                    plan: typeof r.plan === "string" ? r.plan : null,
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
            setError(e instanceof Error ? e.message : t.errorLoadingStudents)
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [t])

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
                credentials: "include",
                body: JSON.stringify(body),
                cache: "no-store",
            })
            const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
            if (!res.ok) {
                const msg = typeof data.error === "string" ? data.error : t.updateFailed
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
            setError(e instanceof Error ? e.message : t.updateFailed)
            await load()
        } finally {
            setBusyEmail(null)
        }
    }

    const openCancelModal = (row: TradingStudentListRow) => {
        if (!row.id) return
        setCancelModal({ userId: row.id })
    }

    const revealAccessCode = async (row: TradingStudentListRow) => {
        const key = row.email.trim().toLowerCase()
        if (revealedCodes[key]) {
            setRevealedCodes((prev) => {
                const next = { ...prev }
                delete next[key]
                return next
            })
            return
        }
        if (revealingEmail) return
        setRevealingEmail(key)
        setError(null)
        try {
            const res = await fetch(`/api/admin/students/${studentPathEmail(row.email)}/access-code`, {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            })
            const data = (await res.json().catch(() => ({}))) as {
                ok?: unknown
                access_code?: unknown
                error?: string
                code?: string
            }
            if (!res.ok || data.ok !== true) {
                throw new Error(
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : data.code === "missing_access_code"
                          ? t.adminAccessCodeMissing
                          : t.adminAccessCodeRevealFailed
                )
            }
            const code =
                typeof data.access_code === "string" && data.access_code.trim()
                    ? data.access_code.trim()
                    : ""
            if (!code) throw new Error(t.adminAccessCodeMissing)
            setRevealedCodes((prev) => ({ ...prev, [key]: code }))
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t.adminAccessCodeRevealFailed)
        } finally {
            setRevealingEmail(null)
        }
    }

    const copyAccessCode = async (email: string, code: string) => {
        const key = email.trim().toLowerCase()
        try {
            await navigator.clipboard.writeText(code)
            setCopiedEmail(key)
            window.setTimeout(() => {
                setCopiedEmail((prev) => (prev === key ? null : prev))
            }, 1600)
        } catch {
            setError(t.adminAccessCodeRevealFailed)
        }
    }

    const confirmRotateAccessCode = async () => {
        if (!rotateTarget || rotateBusy) return
        const email = rotateTarget.email
        const key = email.trim().toLowerCase()
        setRotateBusy(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/admin/students/${studentPathEmail(email)}/rotate-access-code`,
                {
                    method: "POST",
                    credentials: "include",
                    cache: "no-store",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                }
            )
            const data = (await res.json().catch(() => ({}))) as {
                ok?: unknown
                access_code?: unknown
                error?: string
            }
            if (!res.ok || data.ok !== true) {
                throw new Error(
                    typeof data.error === "string" && data.error.trim()
                        ? data.error
                        : t.adminAccessCodeRotateFailed
                )
            }
            const code =
                typeof data.access_code === "string" && data.access_code.trim()
                    ? data.access_code.trim()
                    : ""
            if (!code) throw new Error(t.adminAccessCodeRotateFailed)
            setRevealedCodes((prev) => ({ ...prev, [key]: code }))
            setRotateTarget(null)
            setRotateResult({ email, code })
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t.adminAccessCodeRotateFailed)
            throw e instanceof Error ? e : new Error(t.adminAccessCodeRotateFailed)
        } finally {
            setRotateBusy(false)
        }
    }

    return (
        <div className="space-y-6 text-[#e5e7eb]">
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        marginBottom: 18,
                        flexWrap: "wrap",
                    }}
                >
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.95rem", flex: "1 1 240px" }}>
                        {t.adminStudentsSubtitle}
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="rounded-lg border border-amber-400/40 bg-[#0f172a]/90 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:border-amber-300/60 hover:bg-[#0f172a]"
                    >
                        + {t.adminNewStudent}
                    </button>
                </div>

                <CreateStudentModal
                    open={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSubmit={handleCreateStudent}
                />

                {rotateTarget ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-rotate-access-code-title"
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 62,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 20,
                            background: "rgba(0,0,0,0.72)",
                        }}
                        onClick={rotateBusy ? undefined : () => setRotateTarget(null)}
                    >
                        <div
                            onClick={(ev) => ev.stopPropagation()}
                            style={{
                                width: "100%",
                                maxWidth: 440,
                                borderRadius: 16,
                                border: "1px solid rgba(245,158,11,0.4)",
                                background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                                boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                            }}
                        >
                            <div style={{ padding: "20px 22px 16px" }}>
                                <h2
                                    id="admin-rotate-access-code-title"
                                    style={{
                                        margin: "0 0 12px",
                                        fontSize: "1.1rem",
                                        fontWeight: 800,
                                        color: "#f8fafc",
                                    }}
                                >
                                    {t.adminAccessCodeChangeTitle}
                                </h2>
                                <p
                                    style={{
                                        margin: 0,
                                        color: "#94a3b8",
                                        fontSize: "0.875rem",
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {t.adminAccessCodeChangeDescription}
                                </p>
                                <p
                                    style={{
                                        margin: "12px 0 0",
                                        color: "#cbd5e1",
                                        fontSize: "0.8125rem",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {rotateTarget.email}
                                </p>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    justifyContent: "flex-end",
                                    flexWrap: "wrap",
                                    padding: "12px 18px 18px",
                                    borderTop: "1px solid rgba(59,130,246,0.15)",
                                }}
                            >
                                <button
                                    type="button"
                                    disabled={rotateBusy}
                                    onClick={() => setRotateTarget(null)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(148,163,184,0.35)",
                                        background: "rgba(15,23,42,0.8)",
                                        color: "#e2e8f0",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                        cursor: rotateBusy ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {t.adminPrivateClassCancel}
                                </button>
                                <button
                                    type="button"
                                    disabled={rotateBusy}
                                    onClick={() => {
                                        void confirmRotateAccessCode().catch(() => {
                                            /* error already surfaced via setError */
                                        })
                                    }}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(245,158,11,0.5)",
                                        background: rotateBusy
                                            ? "rgba(100,100,100,0.35)"
                                            : "rgba(180,83,9,0.95)",
                                        color: "#fff",
                                        fontWeight: 800,
                                        fontSize: "0.875rem",
                                        cursor: rotateBusy ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {rotateBusy ? t.loading : t.adminAccessCodeChangeConfirm}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {rotateResult ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-new-access-code-title"
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 63,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 20,
                            background: "rgba(0,0,0,0.72)",
                        }}
                        onClick={() => setRotateResult(null)}
                    >
                        <div
                            onClick={(ev) => ev.stopPropagation()}
                            style={{
                                width: "100%",
                                maxWidth: 420,
                                borderRadius: 16,
                                border: "1px solid rgba(52,211,153,0.35)",
                                background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                                boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                                padding: "22px 22px 18px",
                            }}
                        >
                            <h2
                                id="admin-new-access-code-title"
                                style={{
                                    margin: "0 0 8px",
                                    fontSize: "1.1rem",
                                    fontWeight: 800,
                                    color: "#f8fafc",
                                }}
                            >
                                {t.adminAccessCodeNewTitle}
                            </h2>
                            <p
                                style={{
                                    margin: "0 0 16px",
                                    color: "#94a3b8",
                                    fontSize: "0.8125rem",
                                    lineHeight: 1.5,
                                }}
                            >
                                {t.adminAccessCodeRotateSuccess}
                            </p>
                            <code
                                style={{
                                    display: "block",
                                    marginBottom: 16,
                                    padding: "14px 16px",
                                    borderRadius: 12,
                                    border: "1px solid rgba(251,191,36,0.35)",
                                    background: "rgba(15,23,42,0.95)",
                                    color: "#fde68a",
                                    fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    fontSize: "1.35rem",
                                    fontWeight: 800,
                                    letterSpacing: "0.18em",
                                    textAlign: "center",
                                }}
                            >
                                {rotateResult.code}
                            </code>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    justifyContent: "flex-end",
                                    flexWrap: "wrap",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        void copyAccessCode(rotateResult.email, rotateResult.code)
                                    }
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(52,211,153,0.45)",
                                        background: "rgba(6,78,59,0.55)",
                                        color: "#6ee7b7",
                                        fontWeight: 800,
                                        fontSize: "0.875rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    {copiedEmail === rotateResult.email.trim().toLowerCase()
                                        ? t.adminAccessCodeCopied
                                        : t.adminAccessCodeCopy}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRotateResult(null)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(148,163,184,0.35)",
                                        background: "rgba(15,23,42,0.8)",
                                        color: "#e2e8f0",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    {t.close}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="relative mb-4">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.adminStudentsSearchPlaceholder}
                        aria-label={t.adminStudentsSearchPlaceholder}
                        className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>

                <section
                    style={{
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                        borderRadius: 16,
                        boxShadow: "0 20px 30px -20px rgba(37,99,235,0.35)",
                        overflow: "hidden",
                    }}
                >
                    <CancelSessionConfirmModal
                        open={cancelModal !== null}
                        title={t.cancelSubscriptionTitle}
                        description={t.adminCancelSubscriptionModalDescription}
                        confirmText={t.cancelSubscriptionConfirm}
                        onClose={() => setCancelModal(null)}
                        onConfirm={async () => {
                            if (!cancelModal) return
                            const res = await fetch("/api/admin/cancel-subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                cache: "no-store",
                                body: JSON.stringify({ userId: cancelModal.userId }),
                            })
                            const data = (await res.json().catch(() => ({}))) as {
                                ok?: unknown
                                error?: string
                            }
                            if (!res.ok || data.ok !== true) {
                                const msg =
                                    typeof data.error === "string" && data.error.trim()
                                        ? data.error
                                        : t.cancelFailed
                                throw new Error(msg)
                            }
                        }}
                        onAfterConfirm={async () => {
                            alert(t.adminSubscriptionScheduledCancel)
                            await load()
                        }}
                    />
                    {loading ? (
                        <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>{t.loading}</p>
                    ) : error ? (
                        <p style={{ margin: 0, padding: "16px", color: "#f87171" }}>{error}</p>
                    ) : rows.length === 0 || filteredRows.length === 0 ? (
                        <p style={{ margin: 0, padding: "16px", color: "#9ca3af" }}>{t.noStudentsFound}</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                                <thead>
                                    <tr style={{ background: "rgba(15,23,42,0.7)" }}>
                                        {tableHeaders.map((h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    textAlign: h === t.actions ? "right" : "left",
                                                    padding: "12px 14px",
                                                    color: "#cbd5e1",
                                                    fontSize: "0.75rem",
                                                    letterSpacing: "0.06em",
                                                    textTransform: "uppercase",
                                                    borderBottom: "1px solid rgba(59,130,246,0.2)",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((r) => {
                                        const key = r.email.trim().toLowerCase()
                                        const busy = busyEmail === key
                                        const cancelBusy = false
                                        const active = r.is_active !== false
                                        const currentType = (r.access_type ?? "paid").toLowerCase()
                                        const showCancelSubscription =
                                            Boolean(r.subscription_id) &&
                                            r.subscription_status === "active"
                                        const subscriptionCancelScheduled =
                                            Boolean(r.subscription_id) &&
                                            r.subscription_status ===
                                                SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END
                                        const baseOpts = [...ACCESS_TYPE_OPTIONS] as string[]
                                        const typeOptions = baseOpts.includes(currentType)
                                            ? baseOpts
                                            : [currentType, ...baseOpts]
                                        const program = programLabel(r.plan)
                                        return (
                                            <tr
                                                key={r.id || key}
                                                style={{ borderBottom: "1px solid rgba(148,163,184,0.1)" }}
                                            >
                                                <td
                                                    style={{
                                                        padding: "12px 14px",
                                                        color: "#e5e7eb",
                                                        fontSize: "0.875rem",
                                                        fontWeight: 600,
                                                        maxWidth: 180,
                                                    }}
                                                >
                                                    <span
                                                        title={displayName(r) === "—" ? undefined : displayName(r)}
                                                        style={{
                                                            display: "block",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {displayName(r)}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "12px 14px",
                                                        color: "#e5e7eb",
                                                        fontSize: "0.875rem",
                                                        wordBreak: "break-all",
                                                        maxWidth: 220,
                                                    }}
                                                >
                                                    {r.email}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "12px 14px",
                                                        color: "#94a3b8",
                                                        fontSize: "0.8125rem",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {displayPhone(r)}
                                                </td>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <span
                                                        className={
                                                            program.kind === "full"
                                                                ? "inline-flex rounded-md border border-violet-400/35 bg-violet-500/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-violet-200"
                                                                : program.kind === "trading"
                                                                  ? "inline-flex rounded-md border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-sky-200"
                                                                  : "inline-flex rounded-md border border-slate-400/30 bg-slate-500/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-300"
                                                        }
                                                    >
                                                        {program.text}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <select
                                                        value={currentType}
                                                        disabled={busy || cancelBusy}
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
                                                <td style={{ padding: "10px 14px" }}>
                                                    <label
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 10,
                                                            cursor: busy || cancelBusy ? "wait" : "pointer",
                                                            userSelect: "none",
                                                        }}
                                                    >
                                                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                            {active ? t.activeLabel : t.inactiveLabel}
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
                                                                disabled={busy || cancelBusy}
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
                                                                    cursor:
                                                                        busy || cancelBusy ? "wait" : "pointer",
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
                                                </td>
                                                <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                                                    {(() => {
                                                        const revealed = revealedCodes[key]
                                                        const revealing = revealingEmail === key
                                                        const copied = copiedEmail === key
                                                        return (
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    alignItems: "flex-start",
                                                                    gap: 8,
                                                                    minWidth: 148,
                                                                }}
                                                            >
                                                                <code
                                                                    style={{
                                                                        fontFamily:
                                                                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                                                        fontSize: "0.8125rem",
                                                                        letterSpacing: "0.08em",
                                                                        color: revealed ? "#fde68a" : "#64748b",
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    {revealed ?? t.adminAccessCodeHidden}
                                                                </code>
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        flexWrap: "wrap",
                                                                        gap: 6,
                                                                    }}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            busy ||
                                                                            revealing ||
                                                                            Boolean(revealingEmail) ||
                                                                            rotateBusy
                                                                        }
                                                                        onClick={() => void revealAccessCode(r)}
                                                                        style={{
                                                                            padding: "6px 10px",
                                                                            borderRadius: 8,
                                                                            border: "1px solid rgba(59,130,246,0.4)",
                                                                            background: "rgba(15,23,42,0.9)",
                                                                            color: "#93c5fd",
                                                                            fontWeight: 700,
                                                                            fontSize: "0.7rem",
                                                                            cursor:
                                                                                busy || revealing
                                                                                    ? "wait"
                                                                                    : "pointer",
                                                                        }}
                                                                    >
                                                                        {revealing
                                                                            ? t.loading
                                                                            : revealed
                                                                              ? t.adminAccessCodeHide
                                                                              : t.adminAccessCodeReveal}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={!revealed || busy || rotateBusy}
                                                                        onClick={() => {
                                                                            if (!revealed) return
                                                                            void copyAccessCode(r.email, revealed)
                                                                        }}
                                                                        style={{
                                                                            padding: "6px 10px",
                                                                            borderRadius: 8,
                                                                            border: revealed
                                                                                ? "1px solid rgba(52,211,153,0.4)"
                                                                                : "1px solid rgba(100,116,139,0.35)",
                                                                            background: "rgba(15,23,42,0.9)",
                                                                            color: revealed ? "#6ee7b7" : "#64748b",
                                                                            fontWeight: 700,
                                                                            fontSize: "0.7rem",
                                                                            cursor: revealed ? "pointer" : "not-allowed",
                                                                            opacity: revealed ? 1 : 0.55,
                                                                        }}
                                                                    >
                                                                        {copied
                                                                            ? t.adminAccessCodeCopied
                                                                            : t.adminAccessCodeCopy}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy || rotateBusy || revealing}
                                                                        onClick={() => setRotateTarget(r)}
                                                                        style={{
                                                                            padding: "6px 10px",
                                                                            borderRadius: 8,
                                                                            border: "1px solid rgba(245,158,11,0.45)",
                                                                            background: "rgba(120,53,15,0.35)",
                                                                            color: "#fcd34d",
                                                                            fontWeight: 700,
                                                                            fontSize: "0.7rem",
                                                                            cursor:
                                                                                busy || rotateBusy
                                                                                    ? "wait"
                                                                                    : "pointer",
                                                                        }}
                                                                    >
                                                                        {t.adminAccessCodeChange}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}
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
                                                        {showCancelSubscription ? (
                                                            <button
                                                                type="button"
                                                                disabled={busy || cancelBusy}
                                                                onClick={() => openCancelModal(r)}
                                                                style={{
                                                                    padding: "8px 12px",
                                                                    borderRadius: 10,
                                                                    border: "1px solid rgba(248,113,113,0.45)",
                                                                    background: cancelBusy
                                                                        ? "rgba(100,100,100,0.35)"
                                                                        : "#b91c1c",
                                                                    color: "#fff",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.75rem",
                                                                    cursor:
                                                                        busy || cancelBusy ? "wait" : "pointer",
                                                                }}
                                                            >
                                                                {cancelBusy ? t.loading : t.cancelSubscription}
                                                            </button>
                                                        ) : null}
                                                        {subscriptionCancelScheduled ? (
                                                            <div
                                                                title={t.adminSubscriptionCancelScheduledHint}
                                                                style={{
                                                                    maxWidth: 160,
                                                                    padding: "6px 10px",
                                                                    borderRadius: 10,
                                                                    border: "1px solid rgba(245,158,11,0.4)",
                                                                    background: "rgba(245,158,11,0.12)",
                                                                    color: "#fde68a",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.7rem",
                                                                    lineHeight: 1.35,
                                                                }}
                                                            >
                                                                {t.adminSubscriptionCancelScheduled}
                                                            </div>
                                                        ) : null}
                                                        {!showCancelSubscription &&
                                                        !subscriptionCancelScheduled ? (
                                                            <span
                                                                style={{
                                                                    fontSize: "0.75rem",
                                                                    color: "#64748b",
                                                                }}
                                                            >
                                                                —
                                                            </span>
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
        </div>
    )
}
