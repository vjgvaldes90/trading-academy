import type { SupabaseClient } from "@supabase/supabase-js"
import { sendNewPrivateClassRequestPush } from "@/lib/adminPushSend"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Best-effort push when a student successfully creates a private class request.
 * Push-only: does not write admin_notifications.
 *
 * Idempotency (no persistent ledger by design):
 * - Call only once after a successful INSERT that produced `requestId`.
 * - Each distinct request UUID is a distinct enrollment event (double-submit ⇒ two rows ⇒ two pushes).
 * - Exactly-once delivery across retries is not guaranteed without a push-ledger table.
 */
export async function notifyPrivateClassRequestCreated(
    supabase: SupabaseClient,
    args: { requestId: string }
): Promise<void> {
    const requestId = typeof args.requestId === "string" ? args.requestId.trim() : ""
    if (!requestId || !UUID_RE.test(requestId)) {
        console.error("[admin-push] private_class skip: invalid request id")
        return
    }

    try {
        const result = await sendNewPrivateClassRequestPush(supabase)
        console.log("[admin-push] private_class request push result", {
            requestId,
            attempted: result.attempted,
            accepted: result.accepted,
            removed: result.removed,
        })
    } catch {
        console.error("[admin-push] private_class request push failed (non-blocking)", {
            requestId,
        })
    }
}
