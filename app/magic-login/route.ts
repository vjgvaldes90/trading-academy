import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { attachSingleDeviceSessionCookies } from "@/lib/studentSingleSession"
import { emailAcademyAccessEvaluation } from "@/lib/hasPaid"
import { consumeMagicLoginToken } from "@/lib/magicLoginToken"
import { ensureTradingStudentByEmail, isDashboardProfileComplete } from "@/lib/tradingStudents"

export const runtime = "nodejs"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")?.trim() ?? ""

    console.log("🔥 magic login triggered")

    if (!token) {
        console.log("❌ invalid/expired token", { reason: "missing_token" })
        return NextResponse.redirect(new URL("/login?error=invalid_token", url))
    }

    const supabase = createSupabaseServiceRoleClient()
    const result = await consumeMagicLoginToken(supabase, token)

    if (!result.ok) {
        const reason = result.reason === "expired" ? "expired" : "invalid"
        console.log("❌ invalid/expired token", { reason })
        const errorParam = result.reason === "expired" ? "expired" : "invalid_token"
        return NextResponse.redirect(new URL(`/login?error=${errorParam}`, url))
    }

    const email = result.email.trim().toLowerCase()
    console.log("✅ token valid", { email })
    const accessEv = await emailAcademyAccessEvaluation(supabase, email)
    console.log("[magic-login] academy access check", { email, ok: accessEv.ok, reason: accessEv.reason })

    if (!accessEv.ok) {
        if (accessEv.reason === "expired") {
            console.log("[magic-login] subscription expired → /expired")
            return NextResponse.redirect(new URL("/expired", url))
        }
        if (accessEv.reason === "inactive") {
            console.log("[magic-login] access revoked → /blocked")
            return NextResponse.redirect(new URL("/blocked", url))
        }
        console.log("[magic-login] no academy access → /pricing")
        return NextResponse.redirect(new URL("/pricing", url))
    }

    const profileRow = await ensureTradingStudentByEmail(supabase, email)
    const destination = isDashboardProfileComplete(profileRow) ? "/dashboard" : "/complete-profile"
    if (destination === "/complete-profile") {
        console.log("📄 profile incomplete", { email })
    } else {
        console.log("✅ profile completed", { email })
    }

    const response = NextResponse.redirect(new URL(destination, url))
    setAuthCookiesForPaidUser(response, email)
    await attachSingleDeviceSessionCookies(response, email)
    console.log("✅ session created", { email })
    console.log("➡️ redirecting", { destination })
    console.log("✅ success login", { email, destination })

    return response
}
