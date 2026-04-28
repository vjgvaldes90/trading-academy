import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { attachSingleDeviceSessionCookies } from "@/lib/studentSingleSession"
import { emailAcademyAccessEvaluation } from "@/lib/hasPaid"
import { ensureTradingStudentByEmail, isDashboardProfileComplete } from "@/lib/tradingStudents"

export const runtime = "nodejs"

type EstablishBody = {
    access_token?: unknown
}

/**
 * After the browser completes Supabase magic-link auth, exchange the JWT for academy cookies.
 * Same access rules as `/magic-login` (trading_students + evaluateAcademyAccess).
 */
export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as EstablishBody | null
        const access_token =
            typeof body?.access_token === "string" ? body.access_token.trim() : ""
        if (!access_token) {
            return NextResponse.json({ ok: false, error: "Missing access_token" }, { status: 400 })
        }

        const admin = createSupabaseServiceRoleClient()
        const { data: userData, error: userErr } = await admin.auth.getUser(access_token)
        if (userErr || !userData.user?.email) {
            console.warn("[establish-from-supabase] invalid JWT", userErr?.message)
            return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 })
        }

        const email = userData.user.email.trim().toLowerCase()
        const accessEv = await emailAcademyAccessEvaluation(admin, email)

        if (!accessEv.ok) {
            if (accessEv.reason === "expired") {
                return NextResponse.json(
                    { ok: false, reason: "expired", redirect: "/expired" },
                    { status: 403 }
                )
            }
            if (accessEv.reason === "inactive") {
                return NextResponse.json(
                    { ok: false, reason: "inactive", redirect: "/blocked" },
                    { status: 403 }
                )
            }
            return NextResponse.json(
                { ok: false, reason: accessEv.reason ?? "not_found", redirect: "/pricing" },
                { status: 403 }
            )
        }

        const profileRow = await ensureTradingStudentByEmail(admin, email)
        const redirect = isDashboardProfileComplete(profileRow) ? "/dashboard" : "/complete-profile"

        const res = NextResponse.json({ ok: true, redirect })
        setAuthCookiesForPaidUser(res, email)
        await attachSingleDeviceSessionCookies(res, email)
        console.log("[establish-from-supabase] cookies set", { email, redirect })
        return res
    } catch (e) {
        console.error("[establish-from-supabase]", e)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
