import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { buildStudentDisplayName } from "@/lib/studentLocalStorage"

export const runtime = "nodejs"

async function resolveSessionEmail(): Promise<string | null> {
    const cookieStore = await cookies()
    const legacy = cookieStore.get("session")?.value?.trim().toLowerCase() ?? null
    if (legacy) return legacy
    try {
        const supabase = await createSupabaseServerClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        return user?.email?.trim().toLowerCase() ?? null
    } catch {
        return null
    }
}

/** Hydrate dashboard when `student` is missing from localStorage but session cookie exists */
export async function GET() {
    const email = await resolveSessionEmail()
    if (!email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("trading_students")
            .select("email, first_name, last_name")
            .eq("email", email)
            .maybeSingle()

        if (error || !data) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        const row = data as { email: string; first_name: string | null; last_name: string | null }
        const name = buildStudentDisplayName(row)
        return NextResponse.json({
            name,
            email: row.email,
            classes: [] as string[],
        })
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}
