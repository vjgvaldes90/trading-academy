import type { SupabaseClient } from "@supabase/supabase-js"
import { AnnouncementsRepository } from "@/lib/announcements/repository"
import type {
    Announcement,
    AnnouncementRead,
    AnnouncementServiceResult,
    CreateAnnouncementInput,
    ListAnnouncementsFilters,
    StudentAnnouncementItem,
    StudentAnnouncementsPayload,
    UpdateAnnouncementInput,
} from "@/lib/announcements/types"

export class AnnouncementsService {
    private readonly repo: AnnouncementsRepository

    constructor(supabase: SupabaseClient) {
        this.repo = new AnnouncementsRepository(supabase)
    }

    async getAnnouncements(
        filters: ListAnnouncementsFilters = {}
    ): Promise<AnnouncementServiceResult<Announcement[]>> {
        try {
            const data = await this.repo.getAnnouncements(filters)
            return { ok: true, data }
        } catch (e) {
            console.error("[AnnouncementsService.getAnnouncements]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to list announcements",
                code: "list_failed",
            }
        }
    }

    async getPublishedAnnouncements(
        filters: Omit<ListAnnouncementsFilters, "published"> = {}
    ): Promise<AnnouncementServiceResult<Announcement[]>> {
        return this.getAnnouncements({ ...filters, published: true })
    }

    async listForStudent(
        studentId: string,
        filters: Omit<ListAnnouncementsFilters, "published"> = {}
    ): Promise<AnnouncementServiceResult<StudentAnnouncementsPayload>> {
        try {
            const published = await this.repo.getAnnouncements({
                ...filters,
                published: true,
            })
            const readIds = await this.repo.listReadAnnouncementIds(studentId)
            const announcements: StudentAnnouncementItem[] = published.map((row) => ({
                id: row.id,
                title: row.title,
                message: row.message,
                priority: row.priority,
                created_at: row.created_at,
                read: readIds.has(row.id),
            }))
            const unreadCount = announcements.filter((a) => !a.read).length
            return { ok: true, data: { announcements, unreadCount } }
        } catch (e) {
            console.error("[AnnouncementsService.listForStudent]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to list announcements",
                code: "list_failed",
            }
        }
    }

    async getAnnouncement(id: string): Promise<AnnouncementServiceResult<Announcement>> {
        try {
            const data = await this.repo.getAnnouncement(id)
            if (!data) return { ok: false, error: "Announcement not found", code: "not_found" }
            return { ok: true, data }
        } catch (e) {
            console.error("[AnnouncementsService.getAnnouncement]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to load announcement",
                code: "load_failed",
            }
        }
    }

    async createAnnouncement(
        input: CreateAnnouncementInput
    ): Promise<AnnouncementServiceResult<Announcement>> {
        try {
            const data = await this.repo.createAnnouncement(input)
            return { ok: true, data }
        } catch (e) {
            console.error("[AnnouncementsService.createAnnouncement]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to create announcement",
                code: "create_failed",
            }
        }
    }

    async updateAnnouncement(
        input: UpdateAnnouncementInput
    ): Promise<AnnouncementServiceResult<Announcement>> {
        try {
            const existing = await this.repo.getAnnouncement(input.id)
            if (!existing) return { ok: false, error: "Announcement not found", code: "not_found" }
            const data = await this.repo.updateAnnouncement(input)
            return { ok: true, data }
        } catch (e) {
            console.error("[AnnouncementsService.updateAnnouncement]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to update announcement",
                code: "update_failed",
            }
        }
    }

    async deleteAnnouncement(id: string): Promise<AnnouncementServiceResult<{ id: string }>> {
        try {
            const existing = await this.repo.getAnnouncement(id)
            if (!existing) return { ok: false, error: "Announcement not found", code: "not_found" }
            await this.repo.deleteAnnouncement(id)
            return { ok: true, data: { id } }
        } catch (e) {
            console.error("[AnnouncementsService.deleteAnnouncement]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to delete announcement",
                code: "delete_failed",
            }
        }
    }

    async markAsRead(
        announcementId: string,
        studentId: string
    ): Promise<AnnouncementServiceResult<AnnouncementRead>> {
        try {
            const announcement = await this.repo.getAnnouncement(announcementId)
            if (!announcement) {
                return { ok: false, error: "Announcement not found", code: "not_found" }
            }
            if (!announcement.published) {
                return {
                    ok: false,
                    error: "Announcement is not published",
                    code: "not_published",
                }
            }
            const data = await this.repo.markAsRead(announcementId, studentId)
            return { ok: true, data }
        } catch (e) {
            console.error("[AnnouncementsService.markAsRead]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to mark as read",
                code: "mark_read_failed",
            }
        }
    }

    async getUnreadCount(studentId: string): Promise<AnnouncementServiceResult<number>> {
        try {
            const data = await this.repo.getUnreadCount(studentId)
            return { ok: true, data }
        } catch (e) {
            console.error("[AnnouncementsService.getUnreadCount]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to load unread count",
                code: "unread_count_failed",
            }
        }
    }

    async resolveStudentIdByEmail(email: string): Promise<AnnouncementServiceResult<string>> {
        try {
            const id = await this.repo.findStudentIdByEmail(email)
            if (!id) {
                return { ok: false, error: "Student not found", code: "student_not_found" }
            }
            return { ok: true, data: id }
        } catch (e) {
            console.error("[AnnouncementsService.resolveStudentIdByEmail]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to resolve student",
                code: "student_lookup_failed",
            }
        }
    }
}

export function createAnnouncementsService(supabase: SupabaseClient): AnnouncementsService {
    return new AnnouncementsService(supabase)
}
