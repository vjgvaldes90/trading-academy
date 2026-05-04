import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { stripSensitiveSessionFields } from "@/lib/secureZoomJoin"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Student session list: metadata + availability only (no Zoom URLs).
 * Caller must pass `user_email` for access evaluation.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userEmailRaw =
            searchParams.get("user_email") ?? searchParams.get("userEmail") ?? searchParams.get("email")
        const userEmail = typeof userEmailRaw === "string" ? userEmailRaw.trim().toLowerCase() : ""

        if (!userEmail) {
            return NextResponse.json({ error: "user_email is required" }, { status: 401 })
        }
        if (!EMAIL_RE.test(userEmail)) {
            return NextResponse.json({ error: "Invalid user_email" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", userEmail)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/sessions] access check", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }

        const accessEv = evaluateAcademyAccess(accessRow as TradingStudentAccessRow | null)
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

        const safe = (data ?? []).map((row) => stripSensitiveSessionFields(row as Record<string, unknown>))
        return NextResponse.json(safe)
    } catch (err) {
        console.error("[api/sessions] GET", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
