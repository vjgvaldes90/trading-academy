import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { emailHasPaid } from "@/lib/hasPaid"
import { consumeMagicLoginToken } from "@/lib/magicLoginToken"
import { ensureTradingStudentByEmail, isTradingStudentProfileCompleted } from "@/lib/tradingStudents"

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
    const paid = await emailHasPaid(supabase, email)
    console.log("[magic-login] hasPaid check", { email, hasPaid: paid })

    if (!paid) {
        console.log("[magic-login] unpaid → /pricing")
        return NextResponse.redirect(new URL("/pricing", url))
    }

    const profileRow = await ensureTradingStudentByEmail(supabase, email)
    if (!isTradingStudentProfileCompleted(profileRow)) {
        console.log("📄 profile incomplete", { email })
    } else {
        console.log("✅ profile completed", { email })
    }

    const response = NextResponse.redirect(new URL("/dashboard", url))
    setAuthCookiesForPaidUser(response, email)
    console.log("✅ session created", { email })
    console.log("➡️ redirecting to dashboard")
    console.log("✅ success login", { email, destination: "/dashboard" })

    return response
}
