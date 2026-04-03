import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const token = url.searchParams.get("token") ?? ""
    return NextResponse.redirect(new URL(`/magic-login?token=${encodeURIComponent(token)}`, url))
}
