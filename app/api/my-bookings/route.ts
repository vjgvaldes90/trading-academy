import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const user_email = searchParams.get("user_email")?.trim().toLowerCase() ?? ""

        if (!user_email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", user_email)
            .maybeSingle()
        if (accessErr) {
            console.error("[api/my-bookings] access check", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }
        const accessEv = evaluateAcademyAccess(accessRow as TradingStudentAccessRow | null)
        if (!accessEv.ok) {
            return NextResponse.json(
                { error: "Access denied", reason: accessEv.reason ?? "not_found" },
                { status: 403 }
            )
        }

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("user_email", user_email)
            .eq("status", "confirmed")

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err) {
        console.error("[api/my-bookings] GET", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
