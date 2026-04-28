import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { attachSingleDeviceSessionCookies } from "@/lib/studentSingleSession"
import { buildStudentDisplayName } from "@/lib/studentLocalStorage"
import {
    academyAccessDeniedMessageEs,
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"
import { dashboardPostLoginRedirect, type TradingStudentRow } from "@/lib/tradingStudents"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const { code: inputCode } = await req.json()
        const cleanCode = String(inputCode ?? "").trim().toUpperCase()

        console.log("INPUT:", cleanCode)

        if (!cleanCode) {
            return NextResponse.json({ success: false })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: studentByCode, error: studentLookupErr } = await supabase
            .from("trading_students")
            .select(
                "id, email, first_name, last_name, phone, profile_completed, access_code, access_type, is_active, access_expires_at"
            )
            .eq("access_code", cleanCode)
            .single()

        console.log("DB RESULT:", studentByCode)

        if (!studentLookupErr && studentByCode?.email) {
            const row = studentByCode as TradingStudentRow
            const access = evaluateAcademyAccess(row as TradingStudentAccessRow)
            if (!access.ok) {
                return NextResponse.json({
                    success: false,
                    error: "ACCESS_DENIED",
                    reason: access.reason,
                    message: academyAccessDeniedMessageEs(access.reason),
                })
            }
            const email = row.email.trim().toLowerCase()
            const redirect = dashboardPostLoginRedirect(row)
            const profileCompleted = redirect === "/dashboard"
            if (!profileCompleted) {
                console.log("📄 profile incomplete (first_name / last_name / phone)", { email })
            } else {
                console.log("✅ profile completed", { email })
            }
            const displayName = buildStudentDisplayName(row)
            const response = NextResponse.json({
                success: true,
                redirect,
                user: { email: row.email, access_code: cleanCode },
                profileCompleted,
                student: {
                    name: displayName,
                    email: row.email,
                    classes: [] as string[],
                },
            })
            setAuthCookiesForPaidUser(response, email)
            await attachSingleDeviceSessionCookies(response, email)
            console.log("[login] user logged in (trading_students)", { email })
            return response
        }

        console.log("[login] validate-code failed", {
            code: cleanCode.slice(0, 3) + "***",
        })
        return NextResponse.json({ success: false })
    } catch (err) {
        console.error("❌ ERROR VALIDATE:", err)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
