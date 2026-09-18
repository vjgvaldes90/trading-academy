import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RouteCtx = { params: Promise<{ email: string }> }

/**
 * Admin-only reveal of a student's current access_code.
 * Does not log the code. Auth: admin_session cookie only.
 */
export async function GET(_req: Request, context: RouteCtx) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { email: rawParam } = await context.params
        const email = decodeURIComponent((rawParam ?? "").trim()).toLowerCase()

        if (!email || !EMAIL_RE.test(email)) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("trading_students")
            .select("id, email, access_code")
            .eq("email", email)
            .maybeSingle()

        if (error) {
            console.error("[api/admin/students/access-code] GET lookup failed", {
                email,
                message: error.message,
            })
            return NextResponse.json({ error: "Failed to load access code" }, { status: 500 })
        }
        if (!data) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        const accessCode =
            typeof data.access_code === "string" && data.access_code.trim()
                ? data.access_code.trim()
                : null

        if (!accessCode) {
            return NextResponse.json(
                { error: "Student has no access code", code: "missing_access_code" },
                { status: 404 }
            )
        }

        console.log("[ADMIN ACCESS CODE REVEAL]", {
            admin: auth.email,
            student_email: email,
        })

        return NextResponse.json({
            ok: true,
            email,
            access_code: accessCode,
        })
    } catch (e) {
        console.error("[api/admin/students/access-code] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
