import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
    notifyNewStudentCreated,
    tradingStudentExistsByEmail,
} from "@/lib/adminNotifications"

export const runtime = "nodejs"

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as { email?: unknown } | null
        const raw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
        if (!raw) {
            return NextResponse.json({ error: "Email required" }, { status: 400 })
        }

        const existed = await tradingStudentExistsByEmail(supabase, raw)
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase()

        const { data: upserted, error } = await supabase
            .from("trading_students")
            .upsert(
                { email: raw, access_code: accessCode, access_type: "paid", is_active: true },
                { onConflict: "email" }
            )
            .select("id")
            .single()

        if (error) {
            console.error("[create-user]", error)
            return NextResponse.json({ error: "Error guardando" }, { status: 500 })
        }

        if (!existed) {
            await notifyNewStudentCreated(supabase, {
                email: raw,
                studentId: typeof upserted?.id === "string" ? upserted.id : null,
            })
        }

        return NextResponse.json({ accessCode })
    } catch (e) {
        console.error("[create-user]", e)
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }
}
