import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { buildStudentDisplayName } from "@/lib/studentLocalStorage"
import {
    ensureTradingStudentByEmail,
    isTradingStudentProfileCompleted,
    type TradingStudentRow,
} from "@/lib/tradingStudents"

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
            .select("*")
            .eq("access_code", cleanCode)
            .single()

        console.log("DB RESULT:", studentByCode)

        if (!studentLookupErr && studentByCode?.email) {
            const email = studentByCode.email.trim().toLowerCase()
            const profileCompleted = isTradingStudentProfileCompleted(studentByCode as TradingStudentRow)
            if (!profileCompleted) {
                console.log("📄 profile incomplete", { email })
            } else {
                console.log("✅ profile completed", { email })
            }
            const displayName = buildStudentDisplayName(studentByCode as TradingStudentRow)
            const response = NextResponse.json({
                success: true,
                user: { email: studentByCode.email, access_code: cleanCode },
                profileCompleted,
                student: {
                    name: displayName,
                    email: studentByCode.email,
                    classes: [] as string[],
                },
            })
            setAuthCookiesForPaidUser(response, email)
            console.log("[login] user logged in (trading_students)", { email })
            return response
        }

        const { data, error } = await supabase
            .from("tradingbookings")
            .select("*")
            .eq("access_code", cleanCode)
            .eq("paid", true)
            .maybeSingle()

        if (error || !data) {
            console.log("[login] validate-code failed", { code: cleanCode.slice(0, 3) + "***", hasPaid: false })
            return NextResponse.json({ success: false })
        }

        const email =
            typeof data.email === "string" && data.email.trim().length > 0
                ? data.email.trim().toLowerCase()
                : null

        if (!email) {
            console.log("[login] validate-code no email on row")
            return NextResponse.json({ success: false })
        }

        const student = await ensureTradingStudentByEmail(supabase, email)
        const profileCompleted = isTradingStudentProfileCompleted(student)
        if (!profileCompleted) {
            console.log("📄 profile incomplete", { email })
        } else {
            console.log("✅ profile completed", { email })
        }

        const displayName = buildStudentDisplayName(student)
        const response = NextResponse.json({
            success: true,
            user: data,
            profileCompleted,
            student: {
                name: displayName,
                email,
                classes: [] as string[],
            },
        })
        setAuthCookiesForPaidUser(response, email)

        console.log("[login] user logged in (access code)", { email, hasPaid: true })

        return response
    } catch (err) {
        console.error("❌ ERROR VALIDATE:", err)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
