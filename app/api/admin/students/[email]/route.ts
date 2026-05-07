import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAllowedAdminAccessType } from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RouteCtx = { params: Promise<{ email: string }> }

export async function PATCH(req: Request, context: RouteCtx) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { email: rawParam } = await context.params
        const email = decodeURIComponent((rawParam ?? "").trim()).toLowerCase()

        if (!email || !EMAIL_RE.test(email)) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const b = body as Record<string, unknown>
        const patch: Record<string, unknown> = {}

        if (Object.prototype.hasOwnProperty.call(b, "access_type")) {
            const raw = typeof b.access_type === "string" ? b.access_type.trim().toLowerCase() : ""
            if (!raw || !isAllowedAdminAccessType(raw)) {
                return NextResponse.json(
                    {
                        error: "access_type must be one of: paid, free, vip, discount, discounted",
                    },
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
                    return NextResponse.json(
                        { error: "access_expires_at must be an ISO date string or null" },
                        { status: 400 }
                    )
                }
                patch.access_expires_at = new Date(t).toISOString()
            } else {
                return NextResponse.json(
                    { error: "access_expires_at must be an ISO date string or null" },
                    { status: 400 }
                )
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
            console.error("[api/admin/students/[email]] PATCH", error)
            return NextResponse.json(
                { error: "Failed to update student", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (e: unknown) {
        console.error("[api/admin/students/[email]] PATCH", e)
        const message = e instanceof Error ? e.message : "Unknown error"
        return NextResponse.json({ error: "Internal error", details: message }, { status: 500 })
    }
}
