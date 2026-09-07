import type { TranslationKeys } from "@/lib/i18n/en"
import type { PrivateClassStatus } from "@/lib/privateClassRequests"

export function formatPrivateClassTime(raw: string | null | undefined): string {
    if (!raw) return "—"
    const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim())
    if (!m) return raw
    return `${m[1].padStart(2, "0")}:${m[2]}`
}

export function formatPrivateClassPriceCents(cents: number | null | undefined): string {
    if (typeof cents !== "number" || !Number.isFinite(cents)) return "$250"
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function privateClassStatusLabel(
    status: string,
    t: TranslationKeys,
    opts?: { forAdmin?: boolean }
): string {
    switch (status as PrivateClassStatus) {
        case "pending":
            return t.privateClassStatusPending
        case "rejected":
            return t.privateClassStatusRejected
        case "awaiting_payment":
            return t.privateClassStatusAwaitingPayment
        case "paid":
            return opts?.forAdmin ? t.adminPrivateClassFilterPaid : t.privateClassStatusPaid
        case "confirmed":
            return t.privateClassStatusConfirmed
        case "completed":
            return t.privateClassStatusCompleted
        case "cancelled":
            return t.privateClassStatusCancelled
        default:
            return status
    }
}

export function privateClassStatusBadgeClass(status: string): string {
    switch (status) {
        case "pending":
            return "border-amber-400/35 bg-amber-500/15 text-amber-100"
        case "awaiting_payment":
            return "border-sky-400/35 bg-sky-500/15 text-sky-100"
        case "paid":
            return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
        case "confirmed":
            return "border-blue-400/35 bg-blue-500/15 text-blue-100"
        case "completed":
            return "border-slate-400/25 bg-white/5 text-slate-300"
        case "rejected":
            return "border-red-400/35 bg-red-500/15 text-red-100"
        case "cancelled":
            return "border-slate-500/30 bg-slate-500/10 text-slate-400"
        default:
            return "border-white/15 bg-white/5 text-slate-300"
    }
}
