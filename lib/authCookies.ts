import type { NextResponse } from "next/server"

export const SESSION_COOKIE = "session"
export const HAS_PAID_COOKIE = "hasPaid"

const WEEK_SECONDS = 60 * 60 * 24 * 7

export function cookieBaseOptions() {
    const secure = process.env.NODE_ENV === "production"
    return {
        httpOnly: true as const,
        path: "/" as const,
        sameSite: "lax" as const,
        secure,
        maxAge: WEEK_SECONDS,
    }
}

export function setSessionCookie(response: NextResponse, email: string) {
    response.cookies.set(SESSION_COOKIE, email.trim().toLowerCase(), cookieBaseOptions())
    console.log("[auth] session cookie set", { email: email.trim().toLowerCase() })
}

export function setHasPaidCookie(response: NextResponse) {
    response.cookies.set(HAS_PAID_COOKIE, "1", cookieBaseOptions())
    console.log("[auth] hasPaid cookie set", { hasPaid: true })
}

export function setAuthCookiesForPaidUser(response: NextResponse, email: string) {
    setSessionCookie(response, email)
    setHasPaidCookie(response)
    console.log("[auth] redirect after login", { hasPaid: true, target: "client" })
}

export function clearAuthCookies(response: NextResponse) {
    const opts = { ...cookieBaseOptions(), maxAge: 0 }
    response.cookies.set(SESSION_COOKIE, "", opts)
    response.cookies.set(HAS_PAID_COOKIE, "", opts)
    console.log("[auth] cookies cleared (logout)")
}
