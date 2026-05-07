import { NextResponse } from "next/server"
import { isAuthorizedAdminEmail, normalizeUserEmail } from "@/lib/adminEmails"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
export { ADMIN_EMAILS } from "@/lib/adminEmails"
export { isAuthorizedAdminEmail } from "@/lib/adminEmails"

export async function getAuthorizedAdminEmailFromCookies(): Promise<string | null> {
    const verifiedEmail = await getVerifiedStudentEmailFromCookies()
    if (!verifiedEmail) return null
    const normalized = normalizeUserEmail(verifiedEmail)
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
