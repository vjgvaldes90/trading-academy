import { cookies } from "next/headers"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { SESSION_TOKEN_COOKIE, USER_EMAIL_COOKIE } from "@/lib/authCookies"

/**
 * Email from HttpOnly cookies only if `session_token` matches `trading_students.session_token`
 * (same rule as `proxy.ts` single-session gate).
 */
export async function getVerifiedStudentEmailFromCookies(): Promise<string | null> {
    const jar = await cookies()
    const email = jar.get(USER_EMAIL_COOKIE)?.value?.trim().toLowerCase() ?? ""
    const token = jar.get(SESSION_TOKEN_COOKIE)?.value?.trim() ?? ""
    if (!email || !token) return null

    const supabase = createSupabaseServiceRoleClient()
    const { data, error } = await supabase
        .from("trading_students")
        .select("session_token")
        .eq("email", email)
        .maybeSingle()

    if (error || !data) return null
    const dbToken = data.session_token != null ? String(data.session_token).trim() : ""
    if (!dbToken || dbToken !== token) return null
    return email
}
