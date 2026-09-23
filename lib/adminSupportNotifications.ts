import type { SupabaseClient } from "@supabase/supabase-js"
import { sendNewSupportTicketPush } from "@/lib/adminPushSend"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Best-effort push when a student successfully creates a Support ticket.
 * Push-only: does not write admin_notifications.
 *
 * Idempotency (no persistent ledger by design):
 * - Call only once after SupportService.createTicket succeeds (ticket + initial message).
 * - Each distinct ticket UUID is a distinct event (double-submit ⇒ two tickets ⇒ two pushes).
 * - Exactly-once delivery across retries is not guaranteed without a push-ledger table.
 */
export async function notifySupportTicketCreated(
    supabase: SupabaseClient,
    args: { ticketId: string }
): Promise<void> {
    const ticketId = typeof args.ticketId === "string" ? args.ticketId.trim() : ""
    if (!ticketId || !UUID_RE.test(ticketId)) {
        console.error("[admin-push] support_ticket skip: invalid ticket id")
        return
    }

    try {
        const result = await sendNewSupportTicketPush(supabase)
        console.log("[admin-push] support_ticket push result", {
            ticketId,
            attempted: result.attempted,
            accepted: result.accepted,
            removed: result.removed,
        })
    } catch {
        console.error("[admin-push] support_ticket push failed (non-blocking)", {
            ticketId,
        })
    }
}
