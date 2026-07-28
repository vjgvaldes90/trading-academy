"use server"

import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    addSupportMessageSchema,
    createSupportService,
    createSupportTicketSchema,
    listSupportTicketsQuerySchema,
    supportTicketIdSchema,
    updateSupportTicketSchema,
    type SupportServiceResult,
    type SupportTicket,
    type SupportTicketWithMessages,
    type SupportMessage,
    type SupportTicketStatusCounts,
    type SupportStudentProfile,
} from "@/lib/support"

function fail<T>(error: string, code?: string): SupportServiceResult<T> {
    return { ok: false, error, code }
}

export async function createSupportTicketAction(
    raw: unknown
): Promise<SupportServiceResult<SupportTicketWithMessages>> {
    const email = await getVerifiedStudentEmailFromCookies()
    if (!email) return fail("Unauthorized", "unauthorized")

    const parsed = createSupportTicketSchema.safeParse(raw)
    if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    const studentIdResult = await service.resolveStudentIdByEmail(email)
    if (!studentIdResult.ok) return studentIdResult

    return service.createTicket({
        studentId: studentIdResult.data,
        studentEmail: email,
        subject: parsed.data.subject,
        category: parsed.data.category,
        priority: parsed.data.priority,
        body: parsed.data.body,
    })
}

export async function listMySupportTicketsAction(
    rawFilters: unknown = {}
): Promise<SupportServiceResult<SupportTicket[]>> {
    const email = await getVerifiedStudentEmailFromCookies()
    if (!email) return fail("Unauthorized", "unauthorized")

    const parsed = listSupportTicketsQuerySchema.safeParse(rawFilters ?? {})
    if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid filters", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.listTicketsForStudent(email, {
        status: parsed.data.status,
        priority: parsed.data.priority,
        category: parsed.data.category,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
    })
}

export async function getMySupportTicketAction(
    ticketIdRaw: unknown
): Promise<SupportServiceResult<SupportTicketWithMessages>> {
    const email = await getVerifiedStudentEmailFromCookies()
    if (!email) return fail("Unauthorized", "unauthorized")

    const ticketId = supportTicketIdSchema.safeParse(ticketIdRaw)
    if (!ticketId.success) return fail("Invalid ticket id", "validation_error")

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.getTicketForStudent(ticketId.data, email)
}

export async function addMySupportMessageAction(
    ticketIdRaw: unknown,
    raw: unknown
): Promise<SupportServiceResult<{ ticket: SupportTicket; message: SupportMessage }>> {
    const email = await getVerifiedStudentEmailFromCookies()
    if (!email) return fail("Unauthorized", "unauthorized")

    const ticketId = supportTicketIdSchema.safeParse(ticketIdRaw)
    if (!ticketId.success) return fail("Invalid ticket id", "validation_error")

    const parsed = addSupportMessageSchema.safeParse(raw)
    if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.addStudentMessage(ticketId.data, email, parsed.data.body)
}

export async function listAdminSupportTicketsAction(
    rawFilters: unknown = {}
): Promise<SupportServiceResult<SupportTicket[]>> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) return fail("Unauthorized", "unauthorized")

    const parsed = listSupportTicketsQuerySchema.safeParse(rawFilters ?? {})
    if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid filters", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.listTicketsForAdmin({
        status: parsed.data.status,
        priority: parsed.data.priority,
        category: parsed.data.category,
        assignedAdminEmail: parsed.data.assignedAdminEmail,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
    })
}

export async function getAdminSupportTicketAction(
    ticketIdRaw: unknown
): Promise<SupportServiceResult<SupportTicketWithMessages>> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) return fail("Unauthorized", "unauthorized")

    const ticketId = supportTicketIdSchema.safeParse(ticketIdRaw)
    if (!ticketId.success) return fail("Invalid ticket id", "validation_error")

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.getTicketForAdmin(ticketId.data)
}

export async function updateAdminSupportTicketAction(
    ticketIdRaw: unknown,
    raw: unknown
): Promise<SupportServiceResult<SupportTicket>> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) return fail("Unauthorized", "unauthorized")

    const ticketId = supportTicketIdSchema.safeParse(ticketIdRaw)
    if (!ticketId.success) return fail("Invalid ticket id", "validation_error")

    const parsed = updateSupportTicketSchema.safeParse(raw)
    if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.updateTicketAsAdmin({
        ticketId: ticketId.data,
        status: parsed.data.status,
        priority: parsed.data.priority,
        category: parsed.data.category,
        assignedAdminEmail: parsed.data.assignedAdminEmail,
    })
}

export async function addAdminSupportMessageAction(
    ticketIdRaw: unknown,
    raw: unknown
): Promise<SupportServiceResult<{ ticket: SupportTicket; message: SupportMessage }>> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) return fail("Unauthorized", "unauthorized")

    const ticketId = supportTicketIdSchema.safeParse(ticketIdRaw)
    if (!ticketId.success) return fail("Invalid ticket id", "validation_error")

    const parsed = addSupportMessageSchema.safeParse(raw)
    if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.addAdminMessage({
        ticketId: ticketId.data,
        senderType: "admin",
        senderEmail: adminEmail,
        adminEmail,
        body: parsed.data.body,
        isInternal: parsed.data.isInternal,
        nextStatus: parsed.data.nextStatus,
    })
}

export async function getAdminSupportStatusCountsAction(): Promise<
    SupportServiceResult<SupportTicketStatusCounts>
> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) return fail("Unauthorized", "unauthorized")

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.getStatusCounts()
}

export async function getAdminSupportStudentProfileAction(
    emailRaw: unknown
): Promise<SupportServiceResult<SupportStudentProfile>> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) return fail("Unauthorized", "unauthorized")

    const email =
        typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""
    if (!email || !email.includes("@")) {
        return fail("Invalid email", "validation_error")
    }

    const supabase = createSupabaseServiceRoleClient()
    const service = createSupportService(supabase)
    return service.getStudentProfile(email)
}
