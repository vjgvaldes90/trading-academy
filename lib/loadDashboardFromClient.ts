import type { SupabaseClient } from "@supabase/supabase-js"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import type { DbSession } from "@/lib/sessions"
import type { SubscriptionPlanId } from "@/lib/subscriptionPlans"

type StudentAccessPayload = {
    ok?: unknown
    plan?: unknown
}

/** Uses `/api/student/access` (service-backed) so access rules do not depend on anon RLS. */
async function fetchClientAcademyAccess(email: string): Promise<{
    ok: boolean
    plan: SubscriptionPlanId
}> {
    const norm = email.trim().toLowerCase()
    if (!norm) return { ok: false, plan: "trading_only" }
    try {
        const res = await fetch(`/api/student/access?user_email=${encodeURIComponent(norm)}`, {
            cache: "no-store",
            credentials: "include",
        })
        if (!res.ok) return { ok: false, plan: "trading_only" }
        const data = (await res.json().catch(() => ({}))) as StudentAccessPayload
        const plan =
            data.plan === "full_program" || data.plan === "trading_only"
                ? data.plan
                : ("trading_only" as const)
        return { ok: data.ok === true, plan }
    } catch {
        return { ok: false, plan: "trading_only" }
    }
}

/**
 * Academy access check for the logged-in dashboard email (uses `/api/student/access`).
 * @param _client unused; kept for call-site compatibility with `loadDashboardFromClient(supabase, email)`.
 */
export async function clientEmailHasPaid(_client: SupabaseClient, email: string): Promise<boolean> {
    return (await fetchClientAcademyAccess(email)).ok
}

export type LoadDashboardResult = {
    sessions: DbSession[]
    canAccess: boolean
    /** From trading_students.plan via /api/student/access (server-authoritative). */
    plan: SubscriptionPlanId
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
    const access = await fetchClientAcademyAccess(email)
    const canAccess = access.ok
    const plan = access.plan

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
        return { sessions: [], canAccess, plan }
    }

    const sessionRows = await sessionsRes.json()
    const rows = Array.isArray(sessionRows) ? sessionRows : []

    const sessions: DbSession[] = rows
        .map((row) => mapSupabaseSessionRow(row as Record<string, unknown>))
        .filter((s): s is DbSession => s != null)

    return { sessions, canAccess, plan }
}
