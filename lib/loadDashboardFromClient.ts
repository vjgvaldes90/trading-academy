import type { SupabaseClient } from "@supabase/supabase-js"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import type { DbSession } from "@/lib/sessions"

/** Uses `/api/student/access` (service-backed) so access rules do not depend on anon RLS. */
async function fetchClientAcademyAccessOk(email: string): Promise<boolean> {
    const norm = email.trim().toLowerCase()
    if (!norm) return false
    try {
        const res = await fetch(`/api/student/access?user_email=${encodeURIComponent(norm)}`, {
            cache: "no-store",
            credentials: "include",
        })
        if (!res.ok) return false
        const data = (await res.json().catch(() => ({}))) as { ok?: unknown }
        return data.ok === true
    } catch {
        return false
    }
}

/**
 * Academy access check for the logged-in dashboard email (uses `/api/student/access`).
 * @param _client unused; kept for call-site compatibility with `loadDashboardFromClient(supabase, email)`.
 */
export async function clientEmailHasPaid(_client: SupabaseClient, email: string): Promise<boolean> {
    return fetchClientAcademyAccessOk(email)
}

export type LoadDashboardResult = {
    sessions: DbSession[]
    canAccess: boolean
}

/** Thrown when `/api/sessions` returns 403 (e.g. revoked / inactive). */
export const ACCESS_REVOKED_ERROR = "ACCESS_REVOKED"

export async function loadDashboardFromClient(
    client: SupabaseClient,
    userEmail: string
): Promise<LoadDashboardResult> {
    void client
    const email = userEmail.trim().toLowerCase()
    if (!email) {
        throw new Error("Missing user_email")
    }
    const canAccess = await fetchClientAcademyAccessOk(email)

    const sessionsRes = await fetch(`/api/sessions?user_email=${encodeURIComponent(email)}`, {
        cache: "no-store",
        credentials: "include",
    })
    if (!sessionsRes.ok) {
        const errBody = await sessionsRes.json().catch(() => ({}))
        console.error("[loadDashboardFromClient] /api/sessions", sessionsRes.status, errBody)
        if (sessionsRes.status === 403) {
            throw new Error(ACCESS_REVOKED_ERROR)
        }
        return { sessions: [], canAccess }
    }

    const sessionRows = await sessionsRes.json()
    const rows = Array.isArray(sessionRows) ? sessionRows : []

    const sessions: DbSession[] = rows
        .map((row) => mapSupabaseSessionRow(row as Record<string, unknown>))
        .filter((s): s is DbSession => s != null)

    return { sessions, canAccess }
}
