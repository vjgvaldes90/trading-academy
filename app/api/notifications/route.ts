import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

function normalizeEmail(raw: string | null): string | null {
    const s = raw?.trim().toLowerCase() ?? ""
    return s.length > 0 ? s : null
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userEmail = normalizeEmail(
            searchParams.get("user_email") ?? searchParams.get("userEmail") ?? searchParams.get("email")
        )

        if (!userEmail) {
            return NextResponse.json({ error: "user_email query required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data, error } = await supabase
            .from("notifications")
            .select("id, user_email, message, read, created_at")
            .eq("user_email", userEmail)
            .eq("read", false)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/notifications] GET", error)
            return NextResponse.json({ error: "Failed to load notifications", details: error.message }, { status: 500 })
        }

        return NextResponse.json(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
        console.error("[api/notifications] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
