import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import { parseTheoryPeriodBounds } from "@/lib/theoryClassQuota"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"
import {
    countTheoryConsumptionsInPersistedWindow,
    findActiveMembershipForSlot,
    parseTheorySlot,
} from "@/lib/theoryPlanning"

export const runtime = "nodejs"

/**
 * Lists Full Program students eligible for a planning theory_slot (1 or 2).
 * Read-only against trading_students + student_theory_consumptions.
 * Does not consume quota.
 */
export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { searchParams } = new URL(req.url)
        const slot = parseTheorySlot(searchParams.get("theory_slot"))
        if (!slot) {
            return NextResponse.json(
                {
                    error: "Query theory_slot is required and must be 1 or 2",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: students, error } = await supabase
            .from("trading_students")
            .select(
                "id, email, first_name, last_name, plan, theory_quota_period_start, theory_quota_period_end, is_active"
            )
            .eq("plan", "full_program")
            .order("created_at", { ascending: false })
            .limit(1000)

        if (error) {
            console.error("[api/admin/theory-planning/eligible-students] GET", error.message)
            return NextResponse.json({ error: "Failed to load students" }, { status: 500 })
        }

        const eligible: Array<{
            id: string
            email: string
            first_name: string | null
            last_name: string | null
            used: number
            theory_slot: 1 | 2
            is_active: boolean | null
        }> = []

        for (const row of students ?? []) {
            if (typeof row.id !== "string" || typeof row.email !== "string") continue
            if (isAuthorizedAdminEmail(row.email)) continue
            if (resolveSubscriptionPlan(row.plan as string | null) !== "full_program") continue

            const period = parseTheoryPeriodBounds(
                row.theory_quota_period_start as string | null,
                row.theory_quota_period_end as string | null
            )
            if (!period) continue

            const counted = await countTheoryConsumptionsInPersistedWindow(
                supabase,
                row.id,
                period.start,
                period.end
            )
            if (!counted.ok) {
                console.error(
                    "[api/admin/theory-planning/eligible-students] count failed",
                    counted.error
                )
                continue
            }

            const used = counted.count
            if (slot === 1 && used !== 0) continue
            if (slot === 2 && used !== 1) continue

            const active = await findActiveMembershipForSlot(supabase, row.id, slot)
            if (!active.ok) continue
            if (active.membership) continue

            eligible.push({
                id: row.id,
                email: row.email,
                first_name: typeof row.first_name === "string" ? row.first_name : null,
                last_name: typeof row.last_name === "string" ? row.last_name : null,
                used,
                theory_slot: slot,
                is_active: row.is_active !== false,
            })
        }

        return NextResponse.json({
            theory_slot: slot,
            students: eligible,
            count: eligible.length,
        })
    } catch (e) {
        console.error("[api/admin/theory-planning/eligible-students] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
