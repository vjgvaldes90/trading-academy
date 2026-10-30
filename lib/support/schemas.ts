import { z } from "zod"
import {
    SUPPORT_MESSAGE_SENDER_TYPES,
    SUPPORT_TICKET_CATEGORIES,
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_STATUSES,
} from "@/lib/support/types"

export const supportTicketStatusSchema = z.enum(SUPPORT_TICKET_STATUSES)
export const supportTicketPrioritySchema = z.enum(SUPPORT_TICKET_PRIORITIES)
export const supportTicketCategorySchema = z.enum(SUPPORT_TICKET_CATEGORIES)
export const supportMessageSenderTypeSchema = z.enum(SUPPORT_MESSAGE_SENDER_TYPES)

export const createSupportTicketSchema = z.object({
    subject: z.string().trim().min(3).max(200),
    category: supportTicketCategorySchema,
    priority: supportTicketPrioritySchema.optional().default("normal"),
    body: z.string().trim().min(1).max(10_000),
})

export const addSupportMessageSchema = z.object({
    body: z.string().trim().min(1).max(10_000),
    isInternal: z.boolean().optional().default(false),
    nextStatus: supportTicketStatusSchema.optional(),
})

export const updateSupportTicketSchema = z
    .object({
        status: supportTicketStatusSchema.optional(),
        priority: supportTicketPrioritySchema.optional(),
        category: supportTicketCategorySchema.optional(),
        assignedAdminEmail: z
            .union([z.string().trim().email(), z.null()])
            .optional(),
    })
    .refine(
        (v) =>
            v.status !== undefined ||
            v.priority !== undefined ||
            v.category !== undefined ||
            v.assignedAdminEmail !== undefined,
        { message: "At least one field is required" }
    )

export const listSupportTicketsQuerySchema = z.object({
    // Cap array filters at the enum size — enough to select every legitimate value, not unbounded payloads.
    status: z
        .union([
            supportTicketStatusSchema,
            z.array(supportTicketStatusSchema).max(SUPPORT_TICKET_STATUSES.length),
        ])
        .optional(),
    priority: z
        .union([
            supportTicketPrioritySchema,
            z.array(supportTicketPrioritySchema).max(SUPPORT_TICKET_PRIORITIES.length),
        ])
        .optional(),
    category: z
        .union([
            supportTicketCategorySchema,
            z.array(supportTicketCategorySchema).max(SUPPORT_TICKET_CATEGORIES.length),
        ])
        .optional(),
    assignedAdminEmail: z.string().trim().email().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
})

export const supportTicketIdSchema = z.string().uuid()

export type CreateSupportTicketParsed = z.infer<typeof createSupportTicketSchema>
export type AddSupportMessageParsed = z.infer<typeof addSupportMessageSchema>
export type UpdateSupportTicketParsed = z.infer<typeof updateSupportTicketSchema>
export type ListSupportTicketsQueryParsed = z.infer<typeof listSupportTicketsQuerySchema>
