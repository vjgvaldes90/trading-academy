import type { TranslationKeys } from "@/lib/i18n/en"
import type {
    SupportTicketCategory,
    SupportTicketPriority,
    SupportTicketStatus,
} from "@/lib/support/types"

export function supportCategoryLabel(t: TranslationKeys, category: SupportTicketCategory): string {
    switch (category) {
        case "login":
            return t.supportCategoryLogin
        case "payment":
            return t.supportCategoryPayment
        case "live_session":
            return t.supportCategoryLiveSession
        case "recorded_class":
            return t.supportCategoryRecordedClass
        case "technical":
            return t.supportCategoryTechnical
        case "account":
            return t.supportCategoryAccount
        case "other":
        default:
            return t.supportCategoryOther
    }
}

export function supportStatusLabel(t: TranslationKeys, status: SupportTicketStatus): string {
    switch (status) {
        case "open":
            return t.supportStatusOpen
        case "in_progress":
            return t.supportStatusInProgress
        case "waiting_student":
            return t.supportStatusWaitingStudent
        case "closed":
            return t.supportStatusClosed
        default:
            return status
    }
}

export function supportPriorityLabel(t: TranslationKeys, priority: SupportTicketPriority): string {
    switch (priority) {
        case "low":
            return t.supportPriorityLow
        case "normal":
            return t.supportPriorityNormal
        case "high":
            return t.supportPriorityHigh
        case "urgent":
            return t.supportPriorityUrgent
        default:
            return priority
    }
}

export function supportStatusBadgeClass(status: SupportTicketStatus): string {
    switch (status) {
        case "open":
            return "border-blue-400/30 bg-blue-500/15 text-blue-200"
        case "in_progress":
            return "border-amber-400/30 bg-amber-500/15 text-amber-100"
        case "waiting_student":
            return "border-violet-400/30 bg-violet-500/15 text-violet-100"
        case "closed":
            return "border-slate-400/25 bg-white/5 text-slate-300"
        default:
            return "border-white/10 bg-white/5 text-slate-300"
    }
}

export function supportPriorityBadgeClass(priority: SupportTicketPriority): string {
    switch (priority) {
        case "low":
            return "border-slate-400/25 bg-white/5 text-slate-300"
        case "normal":
            return "border-blue-400/25 bg-blue-500/10 text-blue-200"
        case "high":
            return "border-orange-400/30 bg-orange-500/15 text-orange-100"
        case "urgent":
            return "border-red-400/30 bg-red-500/15 text-red-100"
        default:
            return "border-white/10 bg-white/5 text-slate-300"
    }
}

export function formatSupportDate(iso: string, language: "en" | "es"): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}
