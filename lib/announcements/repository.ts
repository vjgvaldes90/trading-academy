import type { SupabaseClient } from "@supabase/supabase-js"
import type {
    Announcement,
    AnnouncementPriority,
    AnnouncementRead,
    CreateAnnouncementInput,
    ListAnnouncementsFilters,
    UpdateAnnouncementInput,
} from "@/lib/announcements/types"

type AnnouncementRow = {
    id: string
    title: string
    message: string
    priority: string
    published: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

type AnnouncementReadRow = {
    announcement_id: string
    student_id: string
    read_at: string
}

const ANNOUNCEMENT_SELECT =
    "id, title, message, priority, published, created_by, created_at, updated_at"

const READ_SELECT = "announcement_id, student_id, read_at"

function mapAnnouncement(row: AnnouncementRow): Announcement {
    return {
        id: row.id,
        title: row.title,
        message: row.message,
        priority: row.priority as AnnouncementPriority,
        published: row.published,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

function mapRead(row: AnnouncementReadRow): AnnouncementRead {
    return {
        announcement_id: row.announcement_id,
        student_id: row.student_id,
        read_at: row.read_at,
    }
}

function asArray<T>(value: T | T[] | undefined): T[] | undefined {
    if (value === undefined) return undefined
    return Array.isArray(value) ? value : [value]
}

export class AnnouncementsRepository {
    constructor(private readonly supabase: SupabaseClient) {}

    async getAnnouncements(filters: ListAnnouncementsFilters = {}): Promise<Announcement[]> {
        const limit = filters.limit ?? 50
        const offset = filters.offset ?? 0

        let query = this.supabase
            .from("academy_announcements")
            .select(ANNOUNCEMENT_SELECT)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (filters.published !== undefined) {
            query = query.eq("published", filters.published)
        }

        const priorities = asArray(filters.priority)
        if (priorities?.length) {
            query = query.in("priority", priorities)
        }

        const { data, error } = await query
        if (error) throw new Error(error.message)
        return (Array.isArray(data) ? data : []).map((row) =>
            mapAnnouncement(row as AnnouncementRow)
        )
    }

    async getAnnouncement(id: string): Promise<Announcement | null> {
        const { data, error } = await this.supabase
            .from("academy_announcements")
            .select(ANNOUNCEMENT_SELECT)
            .eq("id", id)
            .maybeSingle()

        if (error) throw new Error(error.message)
        return data ? mapAnnouncement(data as AnnouncementRow) : null
    }

    async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
        const { data, error } = await this.supabase
            .from("academy_announcements")
            .insert({
                title: input.title.trim(),
                message: input.message.trim(),
                priority: input.priority ?? "normal",
                published: input.published ?? true,
                created_by: input.createdBy ?? null,
            })
            .select(ANNOUNCEMENT_SELECT)
            .single()

        if (error || !data) throw new Error(error?.message ?? "Failed to create announcement")
        return mapAnnouncement(data as AnnouncementRow)
    }

    async updateAnnouncement(input: UpdateAnnouncementInput): Promise<Announcement> {
        const patch: Record<string, unknown> = {}
        if (input.title !== undefined) patch.title = input.title.trim()
        if (input.message !== undefined) patch.message = input.message.trim()
        if (input.priority !== undefined) patch.priority = input.priority
        if (input.published !== undefined) patch.published = input.published

        const { data, error } = await this.supabase
            .from("academy_announcements")
            .update(patch)
            .eq("id", input.id)
            .select(ANNOUNCEMENT_SELECT)
            .single()

        if (error || !data) throw new Error(error?.message ?? "Failed to update announcement")
        return mapAnnouncement(data as AnnouncementRow)
    }

    async deleteAnnouncement(id: string): Promise<void> {
        const { error } = await this.supabase.from("academy_announcements").delete().eq("id", id)
        if (error) throw new Error(error.message)
    }

    async markAsRead(announcementId: string, studentId: string): Promise<AnnouncementRead> {
        const { data, error } = await this.supabase
            .from("academy_announcement_reads")
            .upsert(
                {
                    announcement_id: announcementId,
                    student_id: studentId,
                    read_at: new Date().toISOString(),
                },
                { onConflict: "announcement_id,student_id" }
            )
            .select(READ_SELECT)
            .single()

        if (error || !data) throw new Error(error?.message ?? "Failed to mark announcement as read")
        return mapRead(data as AnnouncementReadRow)
    }

    async listReadAnnouncementIds(studentId: string): Promise<Set<string>> {
        const { data, error } = await this.supabase
            .from("academy_announcement_reads")
            .select("announcement_id")
            .eq("student_id", studentId)

        if (error) throw new Error(error.message)

        return new Set(
            (Array.isArray(data) ? data : [])
                .map((row) => (row as { announcement_id?: unknown }).announcement_id)
                .filter((id): id is string => typeof id === "string")
        )
    }

    async findStudentIdByEmail(email: string): Promise<string | null> {
        const normalized = email.trim().toLowerCase()
        const { data, error } = await this.supabase
            .from("trading_students")
            .select("id")
            .eq("email", normalized)
            .maybeSingle()

        if (error) throw new Error(error.message)
        const id =
            data && typeof (data as { id?: unknown }).id === "string"
                ? (data as { id: string }).id
                : null
        return id
    }

    async getUnreadCount(studentId: string): Promise<number> {
        const { data: published, error: pubErr } = await this.supabase
            .from("academy_announcements")
            .select("id")
            .eq("published", true)

        if (pubErr) throw new Error(pubErr.message)

        const publishedIds = (Array.isArray(published) ? published : [])
            .map((row) => (row as { id?: unknown }).id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)

        if (publishedIds.length === 0) return 0

        const readIds = await this.listReadAnnouncementIds(studentId)
        return publishedIds.filter((id) => !readIds.has(id)).length
    }
}
