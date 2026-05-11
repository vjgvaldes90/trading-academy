import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

export async function GET() {
    try {
        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("lessons")
            .select("id, title, description, video_url, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/lessons] GET", error)
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
