import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { email, code } = await req.json()

  // 🔥 luego aquí conectamos con Resend o email service
  console.log("Enviar email a:", email, "Código:", code)

  return NextResponse.json({ success: true })
}