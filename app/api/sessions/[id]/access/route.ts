import { NextResponse } from "next/server"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }

/** Join URLs are no longer returned from this route; use `POST /api/session/join`. */
export async function GET(_req: Request, context: RouteCtx) {
    try {
        const { id: sessionId } = await context.params
        if (!sessionId || !UUID_RE.test(sessionId)) {
            return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
        }

        return NextResponse.json(
            {
                error: "Deprecated",
                message: "Use POST /api/session/join with session cookies for the Zoom join URL.",
            },
            { status: 410 }
        )
    } catch (e) {
        console.error("[api/sessions/[id]/access] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
