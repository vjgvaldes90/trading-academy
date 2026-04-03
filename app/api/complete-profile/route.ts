import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ensureTradingStudentByEmail } from "@/lib/tradingStudents"

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

export async function POST(req: Request) {
    const user = { email: (await resolveSessionEmail()) ?? "" }
    if (!user.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    let body: { firstName?: string; lastName?: string; phone?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    const first_name = typeof body.firstName === "string" ? body.firstName.trim() : ""
    const last_name = typeof body.lastName === "string" ? body.lastName.trim() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""

    if (!first_name || !last_name || !phone) {
        return NextResponse.json(
            { error: "Nombre, apellido y teléfono son obligatorios" },
            { status: 400 }
        )
    }

    console.log("USER EMAIL:", user.email)

    try {
        const supabase = createSupabaseServiceRoleClient()
        await ensureTradingStudentByEmail(supabase, user.email)

        const { data, error } = await supabase
            .from("trading_students")
            .update({
                first_name,
                last_name,
                phone,
                profile_completed: true,
            })
            .eq("email", user.email)
            .select("id")
            .single()

        if (error) {
            console.error("❌ Error saving profile", error)
            return NextResponse.json({ error: "No se pudo guardar el perfil" }, { status: 500 })
        }
        if (!data) {
            console.error("❌ Error saving profile", new Error("No row updated"))
            return NextResponse.json({ error: "No encontramos tu estudiante" }, { status: 404 })
        }

        console.log("✅ Profile saved")
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error("❌ Error saving profile", err)
        return NextResponse.json({ error: "No se pudo guardar el perfil" }, { status: 500 })
    }
}
