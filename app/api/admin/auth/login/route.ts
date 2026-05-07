import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail, normalizeUserEmail } from "@/lib/adminEmails"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { attachSingleDeviceSessionCookies } from "@/lib/studentSingleSession"
import { ensureTradingStudentByEmail } from "@/lib/tradingStudents"

export const runtime = "nodejs"

type Body = { email?: unknown }

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null
        const email = normalizeUserEmail(typeof body?.email === "string" ? body.email : "")
        if (!email) {
            return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 })
        }
        if (!isAuthorizedAdminEmail(email)) {
            return NextResponse.json({ ok: false, error: "Unauthorized corporate account" }, { status: 403 })
        }

        const supabase = createSupabaseServiceRoleClient()
        await ensureTradingStudentByEmail(supabase, email)

        const response = NextResponse.json({ ok: true, redirect: "/admin" })
        setAuthCookiesForPaidUser(response, email)
        await attachSingleDeviceSessionCookies(response, email)
        return response
    } catch (error) {
        console.error("[api/admin/auth/login]", error)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
