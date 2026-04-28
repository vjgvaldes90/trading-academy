import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * TEMPORARY DEBUG: returns all `sessions` rows with `select("*")` and no filters.
 * TODO: restore access check + `status = active` + availability mapping after confirming visibility.
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

        const { data, error } = await supabase.from("sessions").select("*")

        if (error) {
            console.error("[api/sessions] debug query error", error)
            return NextResponse.json([], { status: 200 })
        }

        console.log("SESSIONS RAW:", data)

        return NextResponse.json(data ?? [])
    } catch (err) {
        console.error("API crash:", err)
        return NextResponse.json([], { status: 200 })
    }
}
