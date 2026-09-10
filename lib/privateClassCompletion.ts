/**
 * Mark confirmed Private Classes as completed after their ET slot + duration ends.
 * Does not touch Stripe, Zoom meetings, or schedule fields.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
    isPrivateClassDueForCompletion,
    type PrivateClassCompletionCandidate,
} from "@/lib/privateClassCompletionLogic"

export type CompleteDuePrivateClassesResult = {
    scanned: number
    completedIds: string[]
    failedIds: string[]
}

/**
 * Load confirmed rows, filter those past end in America/New_York, then
 * conditional UPDATE status='completed' WHERE status='confirmed' (idempotent).
 */
export async function completeDuePrivateClasses(args: {
    supabase: SupabaseClient
    now?: Date
}): Promise<CompleteDuePrivateClassesResult> {
    const now = args.now ?? new Date()
    const { supabase } = args

    const { data, error } = await supabase
        .from("private_class_requests")
        .select("id, status, requested_date, requested_time, duration_minutes")
        .eq("status", "confirmed")

    if (error) {
        console.error("[private-class-completion] load confirmed failed", error.message)
        throw new Error(`private_class_completion_load_failed:${error.message}`)
    }

    const rows = (data ?? []) as PrivateClassCompletionCandidate[]
    const due = rows.filter((row) => isPrivateClassDueForCompletion(row, now))
    const completedIds: string[] = []
    const failedIds: string[] = []
    const completedAt = now.toISOString()

    for (const row of due) {
        const { data: updated, error: updateErr } = await supabase
            .from("private_class_requests")
            .update({
                status: "completed",
                completed_at: completedAt,
            })
            .eq("id", row.id)
            .eq("status", "confirmed")
            .select("id")
            .maybeSingle()

        if (updateErr) {
            console.error("[private-class-completion] update failed", {
                id: row.id,
                message: updateErr.message,
            })
            failedIds.push(row.id)
            continue
        }
        if (updated?.id) {
            completedIds.push(String(updated.id))
        }
        // empty update = race lost / already completed — treat as success (idempotent)
    }

    console.log("[private-class-completion] run", {
        scanned: rows.length,
        due: due.length,
        completed: completedIds.length,
        failed: failedIds.length,
    })

    return {
        scanned: rows.length,
        completedIds,
        failedIds,
    }
}
