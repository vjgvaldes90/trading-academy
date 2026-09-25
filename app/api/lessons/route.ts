import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

const LESSON_SELECT_STUDENT =
    "id, title, description, video_url, source_type, class_date, class_type, created_at"

const LESSON_SELECT_ADMIN =
    "id, title, description, video_url, source_type, storage_path, class_date, class_type, created_at"

/**
 * Recorded classes / lessons.
 * Admins: published list for management.
 * Students: academy access only (unchanged rules via evaluateAcademyAccess).
 * Does NOT require full_program / theory entitlement.
 * Omits storage_path from student responses.
 */
export async function GET() {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createSupabaseServiceRoleClient()

        if (isAuthorizedAdminEmail(email)) {
            const { data, error } = await supabase
                .from("lessons")
                .select(LESSON_SELECT_ADMIN)
                .eq("is_published", true)
                .order("created_at", { ascending: false })

            if (error) {
                console.error("[api/lessons] GET admin", error.message)
                return NextResponse.json(
                    { error: "Failed to load lessons", details: error.message },
                    { status: 500 }
                )
            }

            return NextResponse.json(Array.isArray(data) ? data : [])
        }

        const { data: row, error: accessErr } = await supabase
            .from("trading_students")
            .select(
                "access_code, access_type, is_active, access_expires_at, subscription_id, subscription_status"
            )
            .eq("email", email)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/lessons] access lookup", accessErr.message)
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
            .select(LESSON_SELECT_STUDENT)
            .eq("is_published", true)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/lessons] GET", error.message)
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
