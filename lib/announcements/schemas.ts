import { z } from "zod"
import { ANNOUNCEMENT_PRIORITIES } from "@/lib/announcements/types"

export const announcementPrioritySchema = z.enum(ANNOUNCEMENT_PRIORITIES)
export const Priority = announcementPrioritySchema

export const createAnnouncementSchema = z.object({
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(20_000),
    priority: announcementPrioritySchema.optional().default("normal"),
    published: z.boolean().optional().default(true),
    createdBy: z.string().uuid().nullable().optional(),
})

export const CreateAnnouncementSchema = createAnnouncementSchema

export const updateAnnouncementSchema = z
    .object({
        title: z.string().trim().min(1).max(200).optional(),
        message: z.string().trim().min(1).max(20_000).optional(),
        priority: announcementPrioritySchema.optional(),
        published: z.boolean().optional(),
    })
    .refine(
        (v) =>
            v.title !== undefined ||
            v.message !== undefined ||
            v.priority !== undefined ||
            v.published !== undefined,
        { message: "At least one field is required" }
    )

export const UpdateAnnouncementSchema = updateAnnouncementSchema

export const markAnnouncementReadSchema = z.object({
    announcementId: z.string().uuid(),
})

export const announcementIdSchema = z.string().uuid()

export type CreateAnnouncementParsed = z.infer<typeof createAnnouncementSchema>
export type UpdateAnnouncementParsed = z.infer<typeof updateAnnouncementSchema>
export type MarkAnnouncementReadParsed = z.infer<typeof markAnnouncementReadSchema>
