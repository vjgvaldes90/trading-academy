import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isAuthorizedAdminEmail, normalizeUserEmail } from "@/lib/adminEmails"
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession"

export { ADMIN_EMAILS } from "@/lib/adminEmails"
export { isAuthorizedAdminEmail } from "@/lib/adminEmails"

/**
 * Admin identity from signed HttpOnly `admin_session` + ADMIN_EMAILS allowlist.
 * Independent of trading_students / student session_token / ta_student_email.
 */
export async function getAuthorizedAdminEmailFromCookies(): Promise<string | null> {
    const jar = await cookies()
    const token = jar.get(ADMIN_SESSION_COOKIE)?.value
    const email = await verifyAdminSessionToken(token)
    if (!email) return null
    const normalized = normalizeUserEmail(email)
    return isAuthorizedAdminEmail(normalized) ? normalized : null
}

export async function requireAuthorizedAdminFromCookies(): Promise<
    { ok: true; email: string } | { ok: false; response: NextResponse }
> {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        }
    }
    return { ok: true, email: adminEmail }
}
