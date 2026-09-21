import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Public Resend smoke-test endpoint disabled (security).
 * Legitimate emails are sent server-side from pre-enroll / provisioning /
 * Stripe / admin flows — not through this route.
 */
export async function GET() {
    return NextResponse.json(
        { error: "This endpoint is no longer available" },
        { status: 410 }
    )
}
