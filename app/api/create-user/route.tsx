import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email } = await req.json()

  // 🔑 generar código
  const accessCode = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()

  const { error } = await supabase.from("tradingbookings").insert({
    email,
    access_code: accessCode,
    paid: true,
  })

  if (error) {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 })
  }

  return NextResponse.json({ accessCode })
}