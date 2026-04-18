import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const user_email = searchParams.get("user_email")

        if (!user_email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

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
