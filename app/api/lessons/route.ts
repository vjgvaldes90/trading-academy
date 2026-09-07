import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateTheoryAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

/**
 * Recorded theory lessons (video_url).
 * Admins: full list for management.
 * Students: only with theory entitlement (full_program + future program_theory_until + academy active).
 * trading_only / legacy NULL / expired theory window → 403, no lesson payload.
 */
export async function GET() {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (isAuthorizedAdminEmail(email)) {
            const supabase = createSupabaseServiceRoleClient()
            const { data, error } = await supabase
                .from("lessons")
                .select("id, title, description, video_url, created_at")
                .eq("is_published", true)
                .order("created_at", { ascending: false })

            if (error) {
                console.error("[api/lessons] GET admin", error)
                return NextResponse.json(
                    { error: "Failed to load lessons", details: error.message },
                    { status: 500 }
                )
            }

            return NextResponse.json(Array.isArray(data) ? data : [])
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: row, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at, plan, program_theory_until")
            .eq("email", email)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/lessons] access lookup", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }

        const theoryEv = evaluateTheoryAccess(row as TradingStudentAccessRow | null)
        if (!theoryEv.ok) {
            return NextResponse.json(
                {
                    error: "Theory access denied",
                    reason: theoryEv.reason ?? "no_theory",
                },
                { status: 403 }
            )
        }

        const { data, error } = await supabase
            .from("lessons")
            .select("id, title, description, video_url, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/lessons] GET", error)
            return NextResponse.json(
                { error: "Failed to load lessons", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(Array.isArray(data) ? data : [])
    } catch (e) {
        console.error("[api/lessons] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
