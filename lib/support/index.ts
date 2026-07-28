export type {
    SupportTicket,
    SupportMessage,
    SupportTicketWithMessages,
    SupportTicketStatus,
    SupportTicketPriority,
    SupportTicketCategory,
    SupportMessageSenderType,
    CreateSupportTicketInput,
    AddSupportMessageInput,
    UpdateSupportTicketInput,
    ListSupportTicketsFilters,
    SupportServiceResult,
} from "@/lib/support/types"

export {
    SUPPORT_TICKET_STATUSES,
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_CATEGORIES,
    SUPPORT_MESSAGE_SENDER_TYPES,
} from "@/lib/support/types"

export {
    createSupportTicketSchema,
    addSupportMessageSchema,
    updateSupportTicketSchema,
    listSupportTicketsQuerySchema,
    supportTicketIdSchema,
} from "@/lib/support/schemas"

export { SupportRepository } from "@/lib/support/repository"
export { SupportService, createSupportService } from "@/lib/support/service"
