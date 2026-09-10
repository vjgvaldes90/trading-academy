import { NextResponse } from "next/server"
import { preEnrollStudent } from "@/lib/preEnrollStudent"

export const runtime = "nodejs"

/**
 * POST /api/pre-enroll
 * Body: { email: string, plan: "full_program" | "trading_only" }
 *
 * Phase 1 only — creates access_type = pre_enrolled when pre-enrollment is open
 * (America/New_York, before 2026-09-24 00:00). Does not start Stripe Checkout.
 */
export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as {
            email?: unknown
            plan?: unknown
        } | null

        const result = await preEnrollStudent({
            email: body?.email,
            plan: body?.plan,
        })

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, code: result.code, error: result.error },
                { status: result.status }
            )
        }

        return NextResponse.json(
            {
                ok: true,
                created: result.created,
                alreadyRegistered: result.alreadyRegistered,
                email: result.email,
                plan: result.plan,
                accessType: result.accessType,
                accessCode: result.accessCode,
                emailSent: result.emailSent,
                ...(result.emailError ? { emailError: result.emailError } : {}),
            },
            { status: result.created ? 201 : 200 }
        )
    } catch (e) {
        console.error("[api/pre-enroll]", e)
        return NextResponse.json(
            { ok: false, code: "db_error", error: "Internal error" },
            { status: 500 }
        )
    }
}
