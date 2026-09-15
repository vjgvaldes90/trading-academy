import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Disabled (security): this endpoint previously provisioned paid students
 * without authentication. Legitimate flows use Stripe webhook, pre-enroll,
 * admin students/create, and get-session — not this route.
 */
export async function POST() {
    return NextResponse.json(
        { error: "Gone", message: "This endpoint has been permanently disabled." },
        { status: 410 }
    )
}
