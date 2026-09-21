import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    academyAccessDeniedMessageEs,
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"

export const runtime = "nodejs"

/**
 * GET — whether the authenticated student may use the academy (dashboard / live join gate).
 * Identity comes only from verified session cookies (query email is ignored).
 */
export async function GET() {
    try {
        const userEmail = await getVerifiedStudentEmailFromCookies()
        if (!userEmail) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: row, error } = await supabase
            .from("trading_students")
            .select(
                "access_code, access_type, is_active, access_expires_at, plan, subscription_id, subscription_status"
            )
            .eq("email", userEmail)
            .maybeSingle()

        if (error) {
            console.error("[api/student/access] GET query failed")
            return NextResponse.json(
                { ok: false, reason: "not_found", message: academyAccessDeniedMessageEs("not_found") },
                { status: 500 }
            )
        }

        const ev = evaluateAcademyAccess(row as TradingStudentAccessRow | null)

        if (!ev.ok) {
            return NextResponse.json({
                ok: false,
                reason: ev.reason ?? "not_found",
                message: academyAccessDeniedMessageEs(ev.reason),
            })
        }

        const r = row as { access_type?: string | null; plan?: string | null }
        return NextResponse.json({
            ok: true,
            access_type: typeof r.access_type === "string" && r.access_type.trim() ? r.access_type : "paid",
            /** Server-resolved from trading_students.plan (never trust client). */
            plan: resolveSubscriptionPlan(r.plan),
        })
    } catch (e) {
        console.error("[api/student/access] GET", e)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
