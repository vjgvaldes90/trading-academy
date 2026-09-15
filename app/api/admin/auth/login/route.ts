import { NextResponse } from "next/server"
import { z } from "zod"
import { isAuthorizedAdminEmail, normalizeUserEmail } from "@/lib/adminEmails"
import { verifyAdminPassword } from "@/lib/adminPassword"
import {
    adminSessionCookieOptions,
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken,
    isAdminSessionSecretConfigured,
} from "@/lib/adminSession"

export const runtime = "nodejs"

const loginBodySchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1),
})

const GENERIC_UNAUTHORIZED = { ok: false as const, error: "Invalid credentials" }

function unauthorizedResponse() {
    return NextResponse.json(GENERIC_UNAUTHORIZED, { status: 401 })
}

export async function POST(req: Request) {
    try {
        if (!isAdminSessionSecretConfigured()) {
            console.error("[api/admin/auth/login] ADMIN_SESSION_SECRET is not configured")
            return unauthorizedResponse()
        }

        const raw = await req.json().catch(() => null)
        const parsed = loginBodySchema.safeParse(raw)
        if (!parsed.success) {
            return unauthorizedResponse()
        }

        const email = normalizeUserEmail(parsed.data.email)
        const password = parsed.data.password

        if (!email || !password) {
            return unauthorizedResponse()
        }

        // Uniform failure path (generic 401; no email/password enumeration).
        if (!isAuthorizedAdminEmail(email)) {
            return unauthorizedResponse()
        }

        const passwordOk = await verifyAdminPassword(email, password)
        if (!passwordOk) {
            return unauthorizedResponse()
        }

        const session = await createAdminSessionToken(email)
        if (!session) {
            console.error("[api/admin/auth/login] failed to create admin session")
            return unauthorizedResponse()
        }

        const response = NextResponse.json({ ok: true, redirect: "/admin" })
        response.cookies.set(
            ADMIN_SESSION_COOKIE,
            session.token,
            adminSessionCookieOptions(session.maxAgeSeconds)
        )
        return response
    } catch (error) {
        console.error("[api/admin/auth/login]", error instanceof Error ? error.message : "error")
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
