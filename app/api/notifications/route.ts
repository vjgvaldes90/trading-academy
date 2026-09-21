import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"

export const runtime = "nodejs"

export async function GET() {
    try {
        const userEmail = await getVerifiedStudentEmailFromCookies()
        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
            return NextResponse.json(
                { error: "Failed to load notifications", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
        console.error("[api/notifications] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
