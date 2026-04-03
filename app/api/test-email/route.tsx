import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/sendEmail"

export async function GET() {
  try {
    // Simple smoke test for Resend delivery
    await sendEmail("vjgvaldes@gmail.com", "ABC123", "Victor", "http://localhost:3000/magic-login?token=TEST")

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: true })
  }
}