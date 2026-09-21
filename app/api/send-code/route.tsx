import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Public email relay disabled (security).
 * Legitimate welcome emails are sent server-side via sendEmail from
 * pre-enroll / provisioning / Stripe handlers — not through this route.
 */
export async function POST() {
    return NextResponse.json(
        { error: "This endpoint is no longer available" },
        { status: 410 }
    )
}
