import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import { stripSensitiveSessionFields } from "@/lib/secureZoomJoin"
import {
    evaluateAcademyAccess,
    evaluateLiveSessionAccess,
    resolveLiveSessionType,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

/**
 * Student session list: metadata + availability only (no Zoom URLs).
 * Identity comes only from verified session cookies (query email is ignored).
 * Theory Classes are omitted unless evaluateTheoryAccess allows them.
 */
export async function GET() {
    try {
        const userEmail = await getVerifiedStudentEmailFromCookies()
        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select(
                "access_code, access_type, is_active, access_expires_at, plan, program_theory_until, subscription_id, subscription_status"
            )
            .eq("email", userEmail)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/sessions] access check", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }

        const student = accessRow as TradingStudentAccessRow | null
        const accessEv = evaluateAcademyAccess(student)
        if (!accessEv.ok) {
            return NextResponse.json(
                { error: "Access denied", reason: accessEv.reason ?? "not_found" },
                { status: 403 }
            )
        }

        const { data, error } = await supabase.from("sessions").select("*").eq("status", "active")

        if (error) {
            console.error("[api/sessions] query error", error)
            return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 })
        }

        const now = new Date()
        const visible = (data ?? []).filter((row) => {
            const rec = row as Record<string, unknown>
            const sessionType = resolveLiveSessionType(rec.session_type)
            if (sessionType === "trading") return true
            return evaluateLiveSessionAccess(sessionType, student, now).ok
        })

        const safe = visible.map((row) => {
            const stripped = stripSensitiveSessionFields(row as Record<string, unknown>)
            const rec = row as Record<string, unknown>
            return {
                ...stripped,
                session_type: resolveLiveSessionType(rec.session_type),
            }
        })
        return NextResponse.json(safe)
    } catch (err) {
        console.error("[api/sessions] GET", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
