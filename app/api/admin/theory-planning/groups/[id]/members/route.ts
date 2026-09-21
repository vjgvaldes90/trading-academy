import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    THEORY_PLANNING_GROUP_SELECT,
    THEORY_PLANNING_MEMBER_SELECT,
    addTheoryPlanningMemberSchema,
    evaluateTheorySlotEligibility,
    serializeTheoryPlanningGroup,
    theoryPlanningGroupIdSchema,
    type TheoryPlanningGroupRow,
    type TheoryPlanningMemberRow,
} from "@/lib/theoryPlanning"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

type AddMemberRpcResult = {
    status?: unknown
    member_id?: unknown
    group_id?: unknown
    group_status?: unknown
    theory_slot?: unknown
}

function asRpcObject(data: unknown): AddMemberRpcResult | null {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null
    return data as AddMemberRpcResult
}

export async function POST(req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id: rawId } = await context.params
        const idParsed = theoryPlanningGroupIdSchema.safeParse(rawId)
        if (!idParsed.success) {
            return NextResponse.json(
                { error: "Invalid group id", code: "validation_error" },
                { status: 400 }
            )
        }
        const groupId = idParsed.data

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = addTheoryPlanningMemberSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }
        const studentId = parsed.data.student_id

        const supabase = createSupabaseServiceRoleClient()
        const { data: group, error: groupErr } = await supabase
            .from("theory_planning_groups")
            .select(THEORY_PLANNING_GROUP_SELECT)
            .eq("id", groupId)
            .maybeSingle()

        if (groupErr) {
            console.error(
                "[api/admin/theory-planning/groups/[id]/members] POST group",
                groupErr.message
            )
            return NextResponse.json({ error: "Failed to load group" }, { status: 500 })
        }
        if (!group) {
            return NextResponse.json({ error: "Group not found", code: "not_found" }, { status: 404 })
        }

        const groupRow = group as TheoryPlanningGroupRow
        const slot = groupRow.theory_slot === 2 ? 2 : groupRow.theory_slot === 1 ? 1 : null
        if (!slot) {
            return NextResponse.json(
                { error: "Group has invalid theory_slot", code: "validation_error" },
                { status: 500 }
            )
        }

        // Read-only quota eligibility (API). Concurrency for active-slot membership is enforced in RPC.
        const eligibilityFirst = await evaluateTheorySlotEligibility(supabase, studentId, slot)
        if (!eligibilityFirst.ok) {
            const status =
                eligibilityFirst.code === "lookup_failed" &&
                eligibilityFirst.error === "Student not found"
                    ? 404
                    : 400
            return NextResponse.json(
                {
                    error: eligibilityFirst.error,
                    code: eligibilityFirst.code,
                    used: eligibilityFirst.used ?? null,
                    theory_slot: slot,
                },
                { status }
            )
        }

        // Re-validate immediately before the atomic membership RPC.
        const eligibility = await evaluateTheorySlotEligibility(supabase, studentId, slot)
        if (!eligibility.ok) {
            const status =
                eligibility.code === "lookup_failed" && eligibility.error === "Student not found"
                    ? 404
                    : 400
            return NextResponse.json(
                {
                    error: eligibility.error,
                    code: eligibility.code,
                    used: eligibility.used ?? null,
                    theory_slot: slot,
                },
                { status }
            )
        }

        const { data: rpcRaw, error: rpcErr } = await supabase.rpc(
            "add_theory_planning_group_member",
            {
                p_group_id: groupId,
                p_student_id: studentId,
                p_added_by_admin_email: auth.email,
            }
        )

        if (rpcErr) {
            console.error(
                "[api/admin/theory-planning/groups/[id]/members] POST rpc",
                rpcErr.message
            )
            return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
        }

        const rpc = asRpcObject(rpcRaw)
        const rpcStatus = typeof rpc?.status === "string" ? rpc.status : ""

        if (rpcStatus === "invalid_args") {
            return NextResponse.json(
                { error: "Invalid arguments", code: "invalid_args" },
                { status: 400 }
            )
        }
        if (rpcStatus === "group_not_found") {
            return NextResponse.json({ error: "Group not found", code: "not_found" }, { status: 404 })
        }
        if (rpcStatus === "group_not_active") {
            return NextResponse.json(
                {
                    error: "Cannot add members to a group that is not draft or scheduled",
                    code: "group_not_active",
                    status: typeof rpc?.group_status === "string" ? rpc.group_status : null,
                },
                { status: 409 }
            )
        }
        if (rpcStatus === "conflict_active_slot") {
            return NextResponse.json(
                {
                    error: "Student is already in another active planning group for this theory slot",
                    code: "already_in_active_group_for_slot",
                    group_id: typeof rpc?.group_id === "string" ? rpc.group_id : null,
                    group_status: typeof rpc?.group_status === "string" ? rpc.group_status : null,
                    theory_slot: slot,
                },
                { status: 409 }
            )
        }
        if (rpcStatus !== "ok" && rpcStatus !== "already") {
            console.error(
                "[api/admin/theory-planning/groups/[id]/members] POST unexpected rpc status",
                rpcStatus || "empty"
            )
            return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
        }

        const memberId = typeof rpc?.member_id === "string" ? rpc.member_id : null
        let memberRow: TheoryPlanningMemberRow | null = null

        if (memberId) {
            const { data: member, error: memErr } = await supabase
                .from("theory_planning_group_members")
                .select(THEORY_PLANNING_MEMBER_SELECT)
                .eq("id", memberId)
                .maybeSingle()

            if (memErr) {
                console.error(
                    "[api/admin/theory-planning/groups/[id]/members] POST member load",
                    memErr.message
                )
                return NextResponse.json({ error: "Failed to load member" }, { status: 500 })
            }
            memberRow = member as TheoryPlanningMemberRow | null
        }

        if (!memberRow) {
            const { data: member, error: memErr } = await supabase
                .from("theory_planning_group_members")
                .select(THEORY_PLANNING_MEMBER_SELECT)
                .eq("group_id", groupId)
                .eq("student_id", studentId)
                .maybeSingle()

            if (memErr || !member) {
                console.error(
                    "[api/admin/theory-planning/groups/[id]/members] POST member fallback",
                    memErr?.message ?? "missing"
                )
                return NextResponse.json({ error: "Failed to load member" }, { status: 500 })
            }
            memberRow = member as TheoryPlanningMemberRow
        }

        const { data: student } = await supabase
            .from("trading_students")
            .select("id, email, first_name, last_name")
            .eq("id", studentId)
            .maybeSingle()

        const { data: freshGroup } = await supabase
            .from("theory_planning_groups")
            .select(THEORY_PLANNING_GROUP_SELECT)
            .eq("id", groupId)
            .maybeSingle()

        const responseGroup = (freshGroup as TheoryPlanningGroupRow | null) ?? groupRow
        const httpStatus = rpcStatus === "ok" ? 201 : 200

        return NextResponse.json(
            {
                member: {
                    ...memberRow,
                    email: typeof student?.email === "string" ? student.email : null,
                    first_name: typeof student?.first_name === "string" ? student.first_name : null,
                    last_name: typeof student?.last_name === "string" ? student.last_name : null,
                },
                group: serializeTheoryPlanningGroup(responseGroup),
                eligibility: { used: eligibility.used, theory_slot: slot },
                membership_status: rpcStatus,
            },
            { status: httpStatus }
        )
    } catch (e) {
        console.error("[api/admin/theory-planning/groups/[id]/members] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
