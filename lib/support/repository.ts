import type { SupabaseClient } from "@supabase/supabase-js"
import type {
    AddSupportMessageInput,
    CreateSupportTicketInput,
    ListSupportTicketsFilters,
    SupportMessage,
    SupportTicket,
    SupportTicketCategory,
    SupportTicketPriority,
    SupportTicketStatus,
    UpdateSupportTicketInput,
} from "@/lib/support/types"

type TicketRow = {
    id: string
    student_id: string
    student_email: string
    subject: string
    category: string
    priority: string
    status: string
    assigned_admin_email: string | null
    last_message_at: string
    created_at: string
    updated_at: string
    closed_at: string | null
}

type MessageRow = {
    id: string
    ticket_id: string
    sender_type: string
    sender_email: string
    body: string
    is_internal: boolean
    created_at: string
}

const TICKET_SELECT =
    "id, student_id, student_email, subject, category, priority, status, assigned_admin_email, last_message_at, created_at, updated_at, closed_at"

const MESSAGE_SELECT =
    "id, ticket_id, sender_type, sender_email, body, is_internal, created_at"

function mapTicket(row: TicketRow): SupportTicket {
    return {
        id: row.id,
        student_id: row.student_id,
        student_email: row.student_email,
        subject: row.subject,
        category: row.category as SupportTicketCategory,
        priority: row.priority as SupportTicketPriority,
        status: row.status as SupportTicketStatus,
        assigned_admin_email: row.assigned_admin_email,
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        closed_at: row.closed_at,
    }
}

function mapMessage(row: MessageRow): SupportMessage {
    return {
        id: row.id,
        ticket_id: row.ticket_id,
        sender_type: row.sender_type as SupportMessage["sender_type"],
        sender_email: row.sender_email,
        body: row.body,
        is_internal: row.is_internal,
        created_at: row.created_at,
    }
}

function asArray<T>(value: T | T[] | undefined): T[] | undefined {
    if (value === undefined) return undefined
    return Array.isArray(value) ? value : [value]
}

export class SupportRepository {
    constructor(private readonly supabase: SupabaseClient) {}

    async insertTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
        const { data, error } = await this.supabase
            .from("support_tickets")
            .insert({
                student_id: input.studentId,
                student_email: input.studentEmail.trim().toLowerCase(),
                subject: input.subject.trim(),
                category: input.category,
                priority: input.priority ?? "normal",
                status: "open",
            })
            .select(TICKET_SELECT)
            .single()

        if (error || !data) {
            throw new Error(error?.message ?? "Failed to create support ticket")
        }
        return mapTicket(data as TicketRow)
    }

    async insertMessage(input: AddSupportMessageInput): Promise<SupportMessage> {
        const { data, error } = await this.supabase
            .from("support_messages")
            .insert({
                ticket_id: input.ticketId,
                sender_type: input.senderType,
                sender_email: input.senderEmail.trim().toLowerCase(),
                body: input.body.trim(),
                is_internal: input.isInternal ?? false,
            })
            .select(MESSAGE_SELECT)
            .single()

        if (error || !data) {
            throw new Error(error?.message ?? "Failed to create support message")
        }
        return mapMessage(data as MessageRow)
    }

    async findTicketById(ticketId: string): Promise<SupportTicket | null> {
        const { data, error } = await this.supabase
            .from("support_tickets")
            .select(TICKET_SELECT)
            .eq("id", ticketId)
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }
        return data ? mapTicket(data as TicketRow) : null
    }

    async listTickets(filters: ListSupportTicketsFilters = {}): Promise<SupportTicket[]> {
        const limit = filters.limit ?? 50
        const offset = filters.offset ?? 0

        let query = this.supabase
            .from("support_tickets")
            .select(TICKET_SELECT)
            .order("last_message_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (filters.studentId) {
            query = query.eq("student_id", filters.studentId)
        }
        if (filters.studentEmail) {
            query = query.eq("student_email", filters.studentEmail.trim().toLowerCase())
        }

        const statuses = asArray(filters.status)
        if (statuses?.length) {
            query = query.in("status", statuses)
        }
        const priorities = asArray(filters.priority)
        if (priorities?.length) {
            query = query.in("priority", priorities)
        }
        const categories = asArray(filters.category)
        if (categories?.length) {
            query = query.in("category", categories)
        }
        if (filters.assignedAdminEmail !== undefined) {
            if (filters.assignedAdminEmail === null) {
                query = query.is("assigned_admin_email", null)
            } else {
                query = query.eq(
                    "assigned_admin_email",
                    filters.assignedAdminEmail.trim().toLowerCase()
                )
            }
        }

        const { data, error } = await query
        if (error) {
            throw new Error(error.message)
        }
        return (Array.isArray(data) ? data : []).map((row) => mapTicket(row as TicketRow))
    }

    async listMessagesByTicketId(
        ticketId: string,
        opts?: { includeInternal?: boolean }
    ): Promise<SupportMessage[]> {
        let query = this.supabase
            .from("support_messages")
            .select(MESSAGE_SELECT)
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true })

        if (!opts?.includeInternal) {
            query = query.eq("is_internal", false)
        }

        const { data, error } = await query
        if (error) {
            throw new Error(error.message)
        }
        return (Array.isArray(data) ? data : []).map((row) => mapMessage(row as MessageRow))
    }

    async updateTicket(input: UpdateSupportTicketInput): Promise<SupportTicket> {
        const patch: Record<string, unknown> = {}
        if (input.status !== undefined) {
            patch.status = input.status
            patch.closed_at = input.status === "closed" ? new Date().toISOString() : null
        }
        if (input.priority !== undefined) patch.priority = input.priority
        if (input.category !== undefined) patch.category = input.category
        if (input.assignedAdminEmail !== undefined) {
            patch.assigned_admin_email =
                input.assignedAdminEmail === null
                    ? null
                    : input.assignedAdminEmail.trim().toLowerCase()
        }

        const { data, error } = await this.supabase
            .from("support_tickets")
            .update(patch)
            .eq("id", input.ticketId)
            .select(TICKET_SELECT)
            .single()

        if (error || !data) {
            throw new Error(error?.message ?? "Failed to update support ticket")
        }
        return mapTicket(data as TicketRow)
    }

    async touchLastMessageAt(ticketId: string, atIso?: string): Promise<void> {
        const { error } = await this.supabase
            .from("support_tickets")
            .update({ last_message_at: atIso ?? new Date().toISOString() })
            .eq("id", ticketId)

        if (error) {
            throw new Error(error.message)
        }
    }

    async findStudentIdByEmail(email: string): Promise<string | null> {
        const normalized = email.trim().toLowerCase()
        const { data, error } = await this.supabase
            .from("trading_students")
            .select("id")
            .eq("email", normalized)
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }
        const id = data && typeof (data as { id?: unknown }).id === "string" ? (data as { id: string }).id : null
        return id
    }
}
