import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import { SESSION_TOKEN_COOKIE, USER_EMAIL_COOKIE } from "@/lib/authCookies"

function supabaseUrlForEdge(): string | null {
    const u = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    return u || null
}

function supabaseServiceRoleKeyForEdge(): string | null {
    return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

/** API routes that must not require a matching single-session cookie (login, webhooks, checkout, admin). */
function isSingleSessionExemptApiPath(pathname: string): boolean {
    if (pathname.startsWith("/api/admin")) return true

    const exactOrPrefix: string[] = [
        "/api/validate-code",
        "/api/create-checkout",
        "/api/get-session",
        "/api/logout",
        "/api/test-email",
        "/api/webhook",
        "/api/webhooks/stripe",
        "/api/stripe/webhook",
        "/api/create-user",
        "/api/send-code",
        "/api/auth/establish-from-supabase",
        "/api/magic-login",
    ]

    for (const base of exactOrPrefix) {
        if (pathname === base || pathname.startsWith(`${base}/`)) return true
    }
    return false
}

function requiresSingleSessionCheck(pathname: string): boolean {
    if (pathname.startsWith("/admin")) return true
    if (pathname.startsWith("/dashboard")) return true
    if (pathname.startsWith("/complete-profile")) return true
    if (pathname.startsWith("/sessions")) return true
    if (pathname.startsWith("/bookings")) return true
    if (pathname.startsWith("/api/")) return !isSingleSessionExemptApiPath(pathname)
    return false
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    if (!requiresSingleSessionCheck(pathname)) {
        return NextResponse.next()
    }

    const token = request.cookies.get(SESSION_TOKEN_COOKIE)?.value?.trim() ?? ""
    const userEmail = request.cookies.get(USER_EMAIL_COOKIE)?.value?.trim().toLowerCase() ?? ""

    if (!token || !userEmail) {
        const login = new URL(pathname.startsWith("/admin") ? "/admin-login" : "/login", request.url)
        login.searchParams.set("error", "session_expired")
        return NextResponse.redirect(login)
    }

    const url = supabaseUrlForEdge()
    const key = supabaseServiceRoleKeyForEdge()
    if (!url || !key) {
        console.error("[single-session] proxy: missing Supabase URL or service role key")
        const login = new URL(pathname.startsWith("/admin") ? "/admin-login" : "/login", request.url)
        login.searchParams.set("error", "session_expired")
        return NextResponse.redirect(login)
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase
        .from("trading_students")
        .select("session_token")
        .eq("email", userEmail)
        .maybeSingle()

    if (error) {
        console.error("[single-session] proxy DB error", error)
        const login = new URL(pathname.startsWith("/admin") ? "/admin-login" : "/login", request.url)
        login.searchParams.set("error", "session_expired")
        return NextResponse.redirect(login)
    }

    const dbToken = data?.session_token != null ? String(data.session_token).trim() : ""
    if (!dbToken || dbToken !== token) {
        const login = new URL(pathname.startsWith("/admin") ? "/admin-login" : "/login", request.url)
        login.searchParams.set("error", "session_expired")
        return NextResponse.redirect(login)
    }

    if (pathname.startsWith("/admin") && !isAuthorizedAdminEmail(userEmail)) {
        const login = new URL("/admin-login", request.url)
        login.searchParams.set("error", "unauthorized")
        return NextResponse.redirect(login)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
        "/complete-profile/:path*",
        "/sessions/:path*",
        "/bookings/:path*",
        "/api/:path*",
    ],
}
