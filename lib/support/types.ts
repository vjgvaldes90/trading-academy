export const SUPPORT_TICKET_STATUSES = [
    "open",
    "in_progress",
    "waiting_student",
    "closed",
] as const

export const SUPPORT_TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const

export const SUPPORT_TICKET_CATEGORIES = [
    "login",
    "payment",
    "live_session",
    "recorded_class",
    "technical",
    "account",
    "other",
] as const

export const SUPPORT_MESSAGE_SENDER_TYPES = ["student", "admin", "system"] as const

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number]
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number]
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]
export type SupportMessageSenderType = (typeof SUPPORT_MESSAGE_SENDER_TYPES)[number]

export type SupportTicket = {
    id: string
    student_id: string
    student_email: string
    subject: string
    category: SupportTicketCategory
    priority: SupportTicketPriority
    status: SupportTicketStatus
    assigned_admin_email: string | null
    last_message_at: string
    created_at: string
    updated_at: string
    closed_at: string | null
}

export type SupportMessage = {
    id: string
    ticket_id: string
    sender_type: SupportMessageSenderType
    sender_email: string
    body: string
    is_internal: boolean
    created_at: string
}

export type SupportTicketWithMessages = SupportTicket & {
    messages: SupportMessage[]
}

export type CreateSupportTicketInput = {
    studentId: string
    studentEmail: string
    subject: string
    category: SupportTicketCategory
    priority?: SupportTicketPriority
    body: string
}

export type AddSupportMessageInput = {
    ticketId: string
    senderType: SupportMessageSenderType
    senderEmail: string
    body: string
    isInternal?: boolean
    /** When an admin replies publicly, optionally move ticket to waiting_student / in_progress. */
    nextStatus?: SupportTicketStatus
}

export type UpdateSupportTicketInput = {
    ticketId: string
    status?: SupportTicketStatus
    priority?: SupportTicketPriority
    category?: SupportTicketCategory
    assignedAdminEmail?: string | null
}

export type ListSupportTicketsFilters = {
    studentId?: string
    studentEmail?: string
    status?: SupportTicketStatus | SupportTicketStatus[]
    priority?: SupportTicketPriority | SupportTicketPriority[]
    category?: SupportTicketCategory | SupportTicketCategory[]
    assignedAdminEmail?: string | null
    limit?: number
    offset?: number
}

export type SupportServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string }

export type SupportTicketStatusCounts = Record<SupportTicketStatus, number>

export type SupportStudentProfile = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    profile_completed: boolean | null
    access_type: string | null
    is_active: boolean | null
    access_expires_at: string | null
    subscription_status: string | null
    subscription_id: string | null
    created_at: string | null
}
