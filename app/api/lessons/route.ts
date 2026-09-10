import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

/**
 * Recorded classes / lessons (video_url).
 * Admins: published list for management.
 * Students: any with valid academy access (dashboard-eligible).
 * Does NOT require full_program / program_theory_until / theory entitlement.
 * Unauthenticated → 401; inactive / expired / unpaid → 403.
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
            .select("access_code, access_type, is_active, access_expires_at, subscription_id, subscription_status")
            .eq("email", email)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/lessons] access lookup", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }

        const academyEv = evaluateAcademyAccess(row as TradingStudentAccessRow | null)
        if (!academyEv.ok) {
            return NextResponse.json(
                {
                    error: "Academy access denied",
                    reason: academyEv.reason ?? "not_found",
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
