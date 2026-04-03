import { NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/authCookies"

export const runtime = "nodejs"

export async function POST() {
    const res = NextResponse.json({ ok: true })
    clearAuthCookies(res)
    return res
}
