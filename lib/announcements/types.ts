export const ANNOUNCEMENT_PRIORITIES = ["normal", "important", "critical"] as const

export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number]

export type Announcement = {
    id: string
    title: string
    message: string
    priority: AnnouncementPriority
    published: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

export type AnnouncementRead = {
    announcement_id: string
    student_id: string
    read_at: string
}

export type StudentAnnouncementItem = {
    id: string
    title: string
    message: string
    priority: AnnouncementPriority
    created_at: string
    read: boolean
}

export type StudentAnnouncementsPayload = {
    announcements: StudentAnnouncementItem[]
    unreadCount: number
}

export type CreateAnnouncementInput = {
    title: string
    message: string
    priority?: AnnouncementPriority
    published?: boolean
    createdBy?: string | null
}

export type UpdateAnnouncementInput = {
    id: string
    title?: string
    message?: string
    priority?: AnnouncementPriority
    published?: boolean
}

export type ListAnnouncementsFilters = {
    published?: boolean
    priority?: AnnouncementPriority | AnnouncementPriority[]
    limit?: number
    offset?: number
}

export type AnnouncementServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string }
