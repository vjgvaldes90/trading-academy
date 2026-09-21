import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    THEORY_PLANNING_GROUP_SELECT,
    THEORY_PLANNING_MEMBER_SELECT,
    THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED,
    countGroupMembers,
    normalizePlanningTime,
    patchTheoryPlanningGroupSchema,
    serializeTheoryPlanningGroup,
    theoryPlanningGroupIdSchema,
    type TheoryPlanningGroupRow,
    type TheoryPlanningMemberRow,
    type TheoryPlanningMemberWithStudent,
} from "@/lib/theoryPlanning"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

async function loadGroupMembers(
    groupId: string
): Promise<TheoryPlanningMemberWithStudent[]> {
    const supabase = createSupabaseServiceRoleClient()
    const { data: members, error: memErr } = await supabase
        .from("theory_planning_group_members")
        .select(THEORY_PLANNING_MEMBER_SELECT)
        .eq("group_id", groupId)
        .order("added_at", { ascending: true })

    if (memErr) {
        throw new Error(memErr.message)
    }

    const rows = (members ?? []) as TheoryPlanningMemberRow[]
    if (rows.length === 0) return []

    const studentIds = rows.map((m) => m.student_id)
    const { data: students, error: stErr } = await supabase
        .from("trading_students")
        .select("id, email, first_name, last_name")
        .in("id", studentIds)

    if (stErr) {
        throw new Error(stErr.message)
    }

    const studentMap = new Map<
        string,
        { email: string | null; first_name: string | null; last_name: string | null }
    >()
    for (const s of students ?? []) {
        if (typeof s.id !== "string") continue
        studentMap.set(s.id, {
            email: typeof s.email === "string" ? s.email : null,
            first_name: typeof s.first_name === "string" ? s.first_name : null,
            last_name: typeof s.last_name === "string" ? s.last_name : null,
        })
    }

    return rows.map((m) => {
        const profile = studentMap.get(m.student_id)
        return {
            ...m,
            email: profile?.email ?? null,
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
        }
    })
}

export async function GET(_req: Request, context: RouteContext) {
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
        const id = idParsed.data

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("theory_planning_groups")
            .select(THEORY_PLANNING_GROUP_SELECT)
            .eq("id", id)
            .maybeSingle()

        if (error) {
            console.error("[api/admin/theory-planning/groups/[id]] GET", error.message)
            return NextResponse.json({ error: "Failed to load group" }, { status: 500 })
        }
        if (!data) {
            return NextResponse.json({ error: "Group not found", code: "not_found" }, { status: 404 })
        }

        const members = await loadGroupMembers(id)
        return NextResponse.json({
            group: serializeTheoryPlanningGroup(data as TheoryPlanningGroupRow, {
                members,
                member_count: members.length,
            }),
        })
    } catch (e) {
        console.error("[api/admin/theory-planning/groups/[id]] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function PATCH(req: Request, context: RouteContext) {
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
        const id = idParsed.data

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = patchTheoryPlanningGroupSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: existing, error: loadErr } = await supabase
            .from("theory_planning_groups")
            .select(THEORY_PLANNING_GROUP_SELECT)
            .eq("id", id)
            .maybeSingle()

        if (loadErr) {
            console.error("[api/admin/theory-planning/groups/[id]] PATCH load", loadErr.message)
            return NextResponse.json({ error: "Failed to load group" }, { status: 500 })
        }
        if (!existing) {
            return NextResponse.json({ error: "Group not found", code: "not_found" }, { status: 404 })
        }

        const current = existing as TheoryPlanningGroupRow
        const patch: Record<string, unknown> = {
            updated_by_admin_email: auth.email,
        }

        if (Object.prototype.hasOwnProperty.call(parsed.data, "title")) {
            const t = parsed.data.title
            patch.title = typeof t === "string" && t.trim() ? t.trim() : null
        }
        if (Object.prototype.hasOwnProperty.call(parsed.data, "admin_notes")) {
            const n = parsed.data.admin_notes
            patch.admin_notes = typeof n === "string" && n.trim() ? n.trim() : null
        }
        if (Object.prototype.hasOwnProperty.call(parsed.data, "tentative_date")) {
            patch.tentative_date = parsed.data.tentative_date
            patch.tentative_time =
                typeof parsed.data.tentative_time === "string"
                    ? normalizePlanningTime(parsed.data.tentative_time)
                    : null
        }
        if (Object.prototype.hasOwnProperty.call(parsed.data, "confirmed_date")) {
            patch.confirmed_date = parsed.data.confirmed_date
            patch.confirmed_time =
                typeof parsed.data.confirmed_time === "string"
                    ? normalizePlanningTime(parsed.data.confirmed_time)
                    : null
        }

        if (Object.prototype.hasOwnProperty.call(parsed.data, "session_id")) {
            const sessionId = parsed.data.session_id
            if (sessionId === null) {
                patch.session_id = null
            } else if (typeof sessionId === "string") {
                const { data: session, error: sessErr } = await supabase
                    .from("sessions")
                    .select("id, session_type, status")
                    .eq("id", sessionId)
                    .maybeSingle()

                if (sessErr) {
                    console.error(
                        "[api/admin/theory-planning/groups/[id]] PATCH session",
                        sessErr.message
                    )
                    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 })
                }
                if (!session) {
                    return NextResponse.json(
                        { error: "Session not found", code: "session_not_found" },
                        { status: 404 }
                    )
                }
                const sessionType =
                    typeof session.session_type === "string"
                        ? session.session_type.trim().toLowerCase()
                        : ""
                if (sessionType !== "theory") {
                    return NextResponse.json(
                        {
                            error: "Linked session must have session_type = theory",
                            code: "session_not_theory",
                        },
                        { status: 400 }
                    )
                }
                patch.session_id = sessionId
            }
        }

        const nextStatus = parsed.data.status
        if (nextStatus && nextStatus !== current.status) {
            if (nextStatus === "scheduled") {
                const counted = await countGroupMembers(supabase, id)
                if (!counted.ok) {
                    return NextResponse.json({ error: "Failed to count members" }, { status: 500 })
                }
                if (counted.count < THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED) {
                    return NextResponse.json(
                        {
                            error: `Group needs at least ${THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED} members to be scheduled`,
                            code: "insufficient_members",
                            member_count: counted.count,
                            required: THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED,
                        },
                        { status: 400 }
                    )
                }
                if (current.status === "cancelled" || current.status === "completed") {
                    return NextResponse.json(
                        {
                            error: `Cannot schedule a group in status ${current.status}`,
                            code: "invalid_status_transition",
                            current_status: current.status,
                        },
                        { status: 409 }
                    )
                }
            }
            patch.status = nextStatus
        }

        let updateQuery = supabase
            .from("theory_planning_groups")
            .update(patch)
            .eq("id", id)

        if (nextStatus && nextStatus !== current.status) {
            updateQuery = updateQuery.eq("status", current.status)
        }

        const { data: updated, error: updateErr } = await updateQuery
            .select(THEORY_PLANNING_GROUP_SELECT)
            .maybeSingle()

        if (updateErr) {
            if (updateErr.code === "23505") {
                return NextResponse.json(
                    {
                        error: "That live session is already linked to another planning group",
                        code: "session_already_linked",
                    },
                    { status: 409 }
                )
            }
            console.error("[api/admin/theory-planning/groups/[id]] PATCH", updateErr.message)
            return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
        }
        if (!updated) {
            return NextResponse.json(
                {
                    error: "Group was modified concurrently; refresh and try again",
                    code: "conflict",
                    current_status: current.status,
                },
                { status: 409 }
            )
        }

        const members = await loadGroupMembers(id)
        return NextResponse.json({
            group: serializeTheoryPlanningGroup(updated as TheoryPlanningGroupRow, {
                members,
                member_count: members.length,
            }),
        })
    } catch (e) {
        console.error("[api/admin/theory-planning/groups/[id]] PATCH", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
