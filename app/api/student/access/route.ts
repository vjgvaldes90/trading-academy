import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    academyAccessDeniedMessageEs,
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

function normalizeEmail(raw: string | null): string | null {
    const s = raw?.trim().toLowerCase() ?? ""
    return s.length > 0 ? s : null
}

/**
 * GET ?user_email=… — whether this email may use the academy (dashboard / booking gate).
 * Same trust model as /api/my-bookings (caller supplies email).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userEmail = normalizeEmail(
            searchParams.get("user_email") ?? searchParams.get("userEmail") ?? searchParams.get("email")
        )

        if (!userEmail) {
            return NextResponse.json({ ok: false, error: "user_email query required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: row, error } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", userEmail)
            .maybeSingle()

        if (error) {
            console.error("[api/student/access] GET", error)
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

        const r = row as { access_type?: string | null }
        return NextResponse.json({
            ok: true,
            access_type: typeof r.access_type === "string" && r.access_type.trim() ? r.access_type : "paid",
        })
    } catch (e) {
        console.error("[api/student/access] GET", e)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
