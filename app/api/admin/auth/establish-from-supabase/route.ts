import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { attachSingleDeviceSessionCookies } from "@/lib/studentSingleSession"
import { ensureTradingStudentByEmail } from "@/lib/tradingStudents"

export const runtime = "nodejs"

type Body = {
    access_token?: unknown
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null
        const accessToken = typeof body?.access_token === "string" ? body.access_token.trim() : ""
        if (!accessToken) {
            return NextResponse.json({ ok: false, error: "Missing access_token" }, { status: 400 })
        }

        const admin = createSupabaseServiceRoleClient()
        const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
        const email = userData.user?.email?.trim().toLowerCase() ?? ""
        if (userErr || !email) {
            return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 })
        }
        if (!isAuthorizedAdminEmail(email)) {
            return NextResponse.json({ ok: false, error: "Unauthorized corporate account" }, { status: 403 })
        }

        await ensureTradingStudentByEmail(admin, email)

        const res = NextResponse.json({ ok: true, redirect: "/admin" })
        setAuthCookiesForPaidUser(res, email)
        await attachSingleDeviceSessionCookies(res, email)
        return res
    } catch (e) {
        console.error("[api/admin/auth/establish-from-supabase]", e)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
