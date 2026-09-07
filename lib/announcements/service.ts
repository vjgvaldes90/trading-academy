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
            // Best-effort cleanup so expired rows disappear without waiting solely on cron.
            await this.repo.deleteExpiredAnnouncements().catch((err) => {
                console.warn("[AnnouncementsService] expired cleanup skipped", err)
            })
            const data = await this.repo.getAnnouncements({
                ...filters,
                onlyUnexpired: filters.onlyUnexpired !== false,
            })
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
            await this.repo.deleteExpiredAnnouncements().catch((err) => {
                console.warn("[AnnouncementsService.listForStudent] expired cleanup skipped", err)
            })
            const published = await this.repo.getAnnouncements({
                ...filters,
                published: true,
                onlyUnexpired: true,
            })
            const readIds = await this.repo.listReadAnnouncementIds(studentId)
            const announcements: StudentAnnouncementItem[] = published
                .filter((row) => !readIds.has(row.id))
                .map((row) => ({
                    id: row.id,
                    title: row.title,
                    message: row.message,
                    priority: row.priority,
                    created_at: row.created_at,
                    expires_at: row.expires_at,
                    read: false,
                }))
            return { ok: true, data: { announcements, unreadCount: announcements.length } }
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
            const data = await this.repo.updateAnnouncement(input, {
                resetExpiresAtOnFirstPublish: true,
                wasPublished: existing.published,
            })
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
            if (Date.parse(announcement.expires_at) <= Date.now()) {
                return {
                    ok: false,
                    error: "Announcement has expired",
                    code: "expired",
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
            await this.repo.deleteExpiredAnnouncements().catch((err) => {
                console.warn("[AnnouncementsService.getUnreadCount] expired cleanup skipped", err)
            })
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

    async deleteExpiredAnnouncements(): Promise<AnnouncementServiceResult<{ deleted: number }>> {
        try {
            const deleted = await this.repo.deleteExpiredAnnouncements()
            return { ok: true, data: { deleted } }
        } catch (e) {
            console.error("[AnnouncementsService.deleteExpiredAnnouncements]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to delete expired announcements",
                code: "cleanup_failed",
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
