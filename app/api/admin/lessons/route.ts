import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Body = {
    title?: unknown
    description?: unknown
    videoUrl?: unknown
}

export async function POST(req: Request) {
    console.log("🔥 USING ADMIN CLIENT")
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: Body
        try {
            body = (await req.json()) as Body
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const title = typeof body.title === "string" ? body.title.trim() : ""
        const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : ""

        if (!title) {
            return NextResponse.json({ error: "title is required" }, { status: 400 })
        }
        if (!videoUrl) {
            return NextResponse.json({ error: "videoUrl is required" }, { status: 400 })
        }

        console.log("🔥 inserting lesson with admin")
        console.log("SERVICE ROLE:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "EXISTS" : "MISSING")

        const { data, error } = await supabaseAdmin
            .from("lessons")
            .insert([
                {
                    title: body.title,
                    description: body.description,
                    video_url: body.videoUrl,
                    is_published: true,
                },
            ])
            .select("id, title, description, video_url, is_published, created_at")
            .single()

        if (error) {
            console.error("[api/admin/lessons] insert", error)
            return NextResponse.json(
                { error: "Failed to create lesson", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data, { status: 201 })
    } catch (e) {
        console.error("[api/admin/lessons] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
