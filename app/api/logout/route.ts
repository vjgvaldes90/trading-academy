import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { SESSION_COOKIE, USER_EMAIL_COOKIE, clearAuthCookies } from "@/lib/authCookies"
import { clearStudentSessionTokenInDb } from "@/lib/studentSingleSession"

export const runtime = "nodejs"

export async function POST() {
    const cookieStore = await cookies()
    const email =
        cookieStore.get(SESSION_COOKIE)?.value?.trim().toLowerCase() ||
        cookieStore.get(USER_EMAIL_COOKIE)?.value?.trim().toLowerCase() ||
        null
    if (email) {
        await clearStudentSessionTokenInDb(email)
    }

    const res = NextResponse.json({ ok: true })
    clearAuthCookies(res)
    return res
}
