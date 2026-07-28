import type { SupabaseClient } from "@supabase/supabase-js"
import { recordSupportTicketCreated } from "@/lib/activityFeed"
import { SupportRepository } from "@/lib/support/repository"
import type {
    AddSupportMessageInput,
    CreateSupportTicketInput,
    ListSupportTicketsFilters,
    SupportMessage,
    SupportServiceResult,
    SupportTicket,
    SupportTicketWithMessages,
    SupportTicketStatusCounts,
    SupportStudentProfile,
    UpdateSupportTicketInput,
} from "@/lib/support/types"

export class SupportService {
    private readonly repo: SupportRepository
    private readonly supabase: SupabaseClient

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase
        this.repo = new SupportRepository(supabase)
    }

    async createTicket(
        input: CreateSupportTicketInput
    ): Promise<SupportServiceResult<SupportTicketWithMessages>> {
        try {
            const ticket = await this.repo.insertTicket(input)
            const message = await this.repo.insertMessage({
                ticketId: ticket.id,
                senderType: "student",
                senderEmail: input.studentEmail,
                body: input.body,
                isInternal: false,
            })
            await this.repo.touchLastMessageAt(ticket.id, message.created_at)
            const refreshed = await this.repo.findTicketById(ticket.id)
            const finalTicket = refreshed ?? ticket
            await recordSupportTicketCreated(this.supabase, {
                ticketId: finalTicket.id,
                studentEmail: finalTicket.student_email,
                subject: finalTicket.subject,
            })
            return {
                ok: true,
                data: {
                    ...finalTicket,
                    messages: [message],
                },
            }
        } catch (e) {
            console.error("[SupportService.createTicket]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to create ticket",
                code: "create_failed",
            }
        }
    }

    async getTicketForStudent(
        ticketId: string,
        studentEmail: string
    ): Promise<SupportServiceResult<SupportTicketWithMessages>> {
        try {
            const ticket = await this.repo.findTicketById(ticketId)
            if (!ticket) {
                return { ok: false, error: "Ticket not found", code: "not_found" }
            }
            if (ticket.student_email !== studentEmail.trim().toLowerCase()) {
                return { ok: false, error: "Forbidden", code: "forbidden" }
            }
            const messages = await this.repo.listMessagesByTicketId(ticketId, {
                includeInternal: false,
            })
            return { ok: true, data: { ...ticket, messages } }
        } catch (e) {
            console.error("[SupportService.getTicketForStudent]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to load ticket",
                code: "load_failed",
            }
        }
    }

    async getTicketForAdmin(
        ticketId: string
    ): Promise<SupportServiceResult<SupportTicketWithMessages>> {
        try {
            const ticket = await this.repo.findTicketById(ticketId)
            if (!ticket) {
                return { ok: false, error: "Ticket not found", code: "not_found" }
            }
            const messages = await this.repo.listMessagesByTicketId(ticketId, {
                includeInternal: true,
            })
            return { ok: true, data: { ...ticket, messages } }
        } catch (e) {
            console.error("[SupportService.getTicketForAdmin]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to load ticket",
                code: "load_failed",
            }
        }
    }

    async listTicketsForStudent(
        studentEmail: string,
        filters: Omit<ListSupportTicketsFilters, "studentEmail" | "studentId"> = {}
    ): Promise<SupportServiceResult<SupportTicket[]>> {
        try {
            const tickets = await this.repo.listTickets({
                ...filters,
                studentEmail,
            })
            return { ok: true, data: tickets }
        } catch (e) {
            console.error("[SupportService.listTicketsForStudent]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to list tickets",
                code: "list_failed",
            }
        }
    }

    async listTicketsForAdmin(
        filters: ListSupportTicketsFilters = {}
    ): Promise<SupportServiceResult<SupportTicket[]>> {
        try {
            const tickets = await this.repo.listTickets(filters)
            return { ok: true, data: tickets }
        } catch (e) {
            console.error("[SupportService.listTicketsForAdmin]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to list tickets",
                code: "list_failed",
            }
        }
    }

    async addStudentMessage(
        ticketId: string,
        studentEmail: string,
        body: string
    ): Promise<SupportServiceResult<{ ticket: SupportTicket; message: SupportMessage }>> {
        try {
            const ticket = await this.repo.findTicketById(ticketId)
            if (!ticket) {
                return { ok: false, error: "Ticket not found", code: "not_found" }
            }
            if (ticket.student_email !== studentEmail.trim().toLowerCase()) {
                return { ok: false, error: "Forbidden", code: "forbidden" }
            }
            if (ticket.status === "closed") {
                return { ok: false, error: "Ticket is closed", code: "ticket_closed" }
            }

            const message = await this.repo.insertMessage({
                ticketId,
                senderType: "student",
                senderEmail: studentEmail,
                body,
                isInternal: false,
            })
            await this.repo.touchLastMessageAt(ticketId, message.created_at)

            let updated = ticket
            if (ticket.status === "waiting_student") {
                updated = await this.repo.updateTicket({
                    ticketId,
                    status: "in_progress",
                })
            } else {
                const refreshed = await this.repo.findTicketById(ticketId)
                if (refreshed) updated = refreshed
            }

            return { ok: true, data: { ticket: updated, message } }
        } catch (e) {
            console.error("[SupportService.addStudentMessage]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to add message",
                code: "message_failed",
            }
        }
    }

    async addAdminMessage(
        input: AddSupportMessageInput & { adminEmail: string }
    ): Promise<SupportServiceResult<{ ticket: SupportTicket; message: SupportMessage }>> {
        try {
            const ticket = await this.repo.findTicketById(input.ticketId)
            if (!ticket) {
                return { ok: false, error: "Ticket not found", code: "not_found" }
            }
            if (ticket.status === "closed" && !input.isInternal) {
                return { ok: false, error: "Ticket is closed", code: "ticket_closed" }
            }

            const isInternal = input.isInternal ?? false
            const message = await this.repo.insertMessage({
                ticketId: input.ticketId,
                senderType: "admin",
                senderEmail: input.adminEmail,
                body: input.body,
                isInternal,
            })

            if (!isInternal) {
                await this.repo.touchLastMessageAt(input.ticketId, message.created_at)
            }

            let updated = ticket
            const nextStatus =
                input.nextStatus ??
                (!isInternal && ticket.status !== "closed" ? "waiting_student" : undefined)

            if (nextStatus) {
                updated = await this.repo.updateTicket({
                    ticketId: input.ticketId,
                    status: nextStatus,
                })
            } else {
                const refreshed = await this.repo.findTicketById(input.ticketId)
                if (refreshed) updated = refreshed
            }

            return { ok: true, data: { ticket: updated, message } }
        } catch (e) {
            console.error("[SupportService.addAdminMessage]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to add message",
                code: "message_failed",
            }
        }
    }

    async updateTicketAsAdmin(
        input: UpdateSupportTicketInput
    ): Promise<SupportServiceResult<SupportTicket>> {
        try {
            const existing = await this.repo.findTicketById(input.ticketId)
            if (!existing) {
                return { ok: false, error: "Ticket not found", code: "not_found" }
            }
            const updated = await this.repo.updateTicket(input)
            return { ok: true, data: updated }
        } catch (e) {
            console.error("[SupportService.updateTicketAsAdmin]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to update ticket",
                code: "update_failed",
            }
        }
    }

    async resolveStudentIdByEmail(email: string): Promise<SupportServiceResult<string>> {
        try {
            const id = await this.repo.findStudentIdByEmail(email)
            if (!id) {
                return { ok: false, error: "Student not found", code: "student_not_found" }
            }
            return { ok: true, data: id }
        } catch (e) {
            console.error("[SupportService.resolveStudentIdByEmail]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to resolve student",
                code: "student_lookup_failed",
            }
        }
    }

    async getStatusCounts(): Promise<SupportServiceResult<SupportTicketStatusCounts>> {
        try {
            const data = await this.repo.countByStatus()
            return { ok: true, data }
        } catch (e) {
            console.error("[SupportService.getStatusCounts]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to load ticket counts",
                code: "counts_failed",
            }
        }
    }

    async getStudentProfile(
        email: string
    ): Promise<SupportServiceResult<SupportStudentProfile>> {
        try {
            const profile = await this.repo.findStudentProfileByEmail(email)
            if (!profile) {
                return { ok: false, error: "Student not found", code: "student_not_found" }
            }
            return { ok: true, data: profile }
        } catch (e) {
            console.error("[SupportService.getStudentProfile]", e)
            return {
                ok: false,
                error: e instanceof Error ? e.message : "Failed to load student profile",
                code: "student_lookup_failed",
            }
        }
    }
}

export function createSupportService(supabase: SupabaseClient): SupportService {
    return new SupportService(supabase)
}
