import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/sendEmail" // ajusta la ruta si es diferente

export async function POST(req: Request) {
  const { email, code, name } = await req.json()

  console.log("📩 Enviando email a:", email)

  const result = await sendEmail(email, code, name)

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}