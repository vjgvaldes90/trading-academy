import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAllowedAdminAccessType } from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

function normalizeEmail(raw: unknown): string | null {
    const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
    return s.length > 0 ? s : null
}

export async function GET() {
    try {
        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("trading_students")
            .select(
                "id, email, first_name, last_name, phone, profile_completed, access_type, is_active, access_expires_at, access_code, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(500)

        if (error) {
            console.error("[api/admin/trading-students] GET", error)
            return NextResponse.json({ error: "Failed to load students", details: error.message }, { status: 500 })
        }

        return NextResponse.json(Array.isArray(data) ? data : [])
    } catch (e) {
        console.error("[api/admin/trading-students] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const b = body as Record<string, unknown>
        const email = normalizeEmail(b.email)
        if (!email) {
            return NextResponse.json({ error: "email is required" }, { status: 400 })
        }

        const patch: Record<string, unknown> = {}

        if (Object.prototype.hasOwnProperty.call(b, "access_type")) {
            const raw = typeof b.access_type === "string" ? b.access_type.trim().toLowerCase() : ""
            if (!raw || !isAllowedAdminAccessType(raw)) {
                return NextResponse.json(
                    { error: "access_type must be one of: paid, free, discounted, discount, vip" },
                    { status: 400 }
                )
            }
            patch.access_type = raw
        }

        if (Object.prototype.hasOwnProperty.call(b, "is_active")) {
            if (typeof b.is_active !== "boolean") {
                return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 })
            }
            patch.is_active = b.is_active
        }

        if (Object.prototype.hasOwnProperty.call(b, "access_expires_at")) {
            const v = b.access_expires_at
            if (v === null) {
                patch.access_expires_at = null
            } else if (typeof v === "string" && v.trim()) {
                const t = Date.parse(v.trim())
                if (!Number.isFinite(t)) {
                    return NextResponse.json({ error: "access_expires_at must be ISO date or null" }, { status: 400 })
                }
                patch.access_expires_at = new Date(t).toISOString()
            } else {
                return NextResponse.json({ error: "access_expires_at must be ISO string or null" }, { status: 400 })
            }
        }

        if (Object.keys(patch).length === 0) {
            return NextResponse.json(
                { error: "Provide at least one of: access_type, is_active, access_expires_at" },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data, error } = await supabase
            .from("trading_students")
            .update(patch)
            .eq("email", email)
            .select(
                "id, email, first_name, last_name, phone, profile_completed, access_type, is_active, access_expires_at, access_code, created_at"
            )
            .single()

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Student not found" }, { status: 404 })
            }
            console.error("[api/admin/trading-students] PATCH", error)
            return NextResponse.json({ error: "Update failed", details: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (e) {
        console.error("[api/admin/trading-students] PATCH", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
