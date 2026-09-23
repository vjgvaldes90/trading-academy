import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { provisionAcademyStudent } from "@/lib/provisionAcademyStudent"
import { parseCheckoutPlan } from "@/lib/subscriptionPlans"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCESS_TYPES = ["free", "paid", "vip", "discount"] as const

function trimString(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

export async function POST(req: Request) {
    const auth = await requireAuthorizedAdminFromCookies()
    if (!auth.ok) return auth.response

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 }
        )
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json(
            { success: false, error: "Request body must be a JSON object" },
            { status: 400 }
        )
    }

    const b = body as Record<string, unknown>
    const firstName = trimString(b.firstName)
    const lastName = trimString(b.lastName)
    const email = trimString(b.email)
    const accessType = trimString(b.accessType).toLowerCase()

    if (!firstName) {
        return NextResponse.json(
            { success: false, error: "firstName is required" },
            { status: 400 }
        )
    }
    if (!lastName) {
        return NextResponse.json(
            { success: false, error: "lastName is required" },
            { status: 400 }
        )
    }
    if (!email) {
        return NextResponse.json(
            { success: false, error: "email is required" },
            { status: 400 }
        )
    }
    if (!EMAIL_RE.test(email)) {
        return NextResponse.json(
            { success: false, error: "email must be a valid email address" },
            { status: 400 }
        )
    }
    if (!accessType) {
        return NextResponse.json(
            { success: false, error: "accessType is required" },
            { status: 400 }
        )
    }
    if (!(ACCESS_TYPES as readonly string[]).includes(accessType)) {
        return NextResponse.json(
            { success: false, error: "accessType must be one of: free, paid, vip, discount" },
            { status: 400 }
        )
    }

    // Plan only applies to Free students. Default trading_only when omitted.
    let plan: "trading_only" | "full_program" | undefined
    if (accessType === "free") {
        const parsed = parseCheckoutPlan(b.plan)
        if (!parsed.ok) {
            return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
        }
        plan = parsed.plan
    }

    try {
        const result = await provisionAcademyStudent({
            firstName,
            lastName,
            email,
            phone: trimString(b.phone),
            accessType: accessType as (typeof ACCESS_TYPES)[number],
            plan,
        })
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}
