import type { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { cookieBaseOptions, SESSION_TOKEN_COOKIE, USER_EMAIL_COOKIE } from "@/lib/authCookies"

/**
 * Rotates server-side session token and sets httpOnly cookies used by middleware.
 * Call after `setAuthCookiesForPaidUser` on the same response.
 */
export async function attachSingleDeviceSessionCookies(res: NextResponse, email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const sessionToken = crypto.randomUUID()
    const supabase = createSupabaseServiceRoleClient()
    const { error } = await supabase
        .from("trading_students")
        .update({
            session_token: sessionToken,
            session_updated_at: new Date().toISOString(),
        })
        .eq("email", normalized)

    if (error) {
        console.error("[single-session] failed to persist session token", error)
        return
    }

    const opts = cookieBaseOptions()
    res.cookies.set(SESSION_TOKEN_COOKIE, sessionToken, opts)
    res.cookies.set(USER_EMAIL_COOKIE, normalized, opts)
}

export async function clearStudentSessionTokenInDb(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const supabase = createSupabaseServiceRoleClient()
    const { error } = await supabase
        .from("trading_students")
        .update({
            session_token: null,
            session_updated_at: new Date().toISOString(),
        })
        .eq("email", normalized)

    if (error) {
        console.error("[single-session] failed to clear session token", error)
    }
}
