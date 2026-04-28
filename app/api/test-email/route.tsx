import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/sendEmail"

export const runtime = "nodejs"

/**
 * Smoke test for Resend (no Supabase Auth user required).
 * Set `TEST_EMAIL_TO` to control recipient (defaults to the previous hardcoded address).
 */
export async function GET() {
    const testTo = (process.env.TEST_EMAIL_TO ?? "vjgvaldes@gmail.com").trim()
    try {
        const result = await sendEmail(testTo, "ABC123", "Victor")
        if (!result.ok) {
            return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
        }
        return NextResponse.json({ ok: true, id: result.id })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ ok: false, error: true }, { status: 500 })
    }
}
