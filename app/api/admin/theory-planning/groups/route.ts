import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    THEORY_PLANNING_GROUP_SELECT,
    THEORY_PLANNING_MEMBER_SELECT,
    createTheoryPlanningGroupSchema,
    isTheoryPlanningStatus,
    normalizePlanningTime,
    parseTheorySlot,
    serializeTheoryPlanningGroup,
    type TheoryPlanningGroupRow,
    type TheoryPlanningMemberRow,
    type TheoryPlanningMemberWithStudent,
} from "@/lib/theoryPlanning"

export const runtime = "nodejs"

async function loadMembersForGroups(
    groupIds: string[]
): Promise<Map<string, TheoryPlanningMemberWithStudent[]>> {
    const map = new Map<string, TheoryPlanningMemberWithStudent[]>()
    if (groupIds.length === 0) return map

    const supabase = createSupabaseServiceRoleClient()
    const { data: members, error: memErr } = await supabase
        .from("theory_planning_group_members")
        .select(THEORY_PLANNING_MEMBER_SELECT)
        .in("group_id", groupIds)
        .order("added_at", { ascending: true })

    if (memErr) {
        throw new Error(memErr.message)
    }

    const rows = (members ?? []) as TheoryPlanningMemberRow[]
    const studentIds = [...new Set(rows.map((m) => m.student_id).filter(Boolean))]

    const studentMap = new Map<
        string,
        { email: string | null; first_name: string | null; last_name: string | null }
    >()

    if (studentIds.length > 0) {
        const { data: students, error: stErr } = await supabase
            .from("trading_students")
            .select("id, email, first_name, last_name")
            .in("id", studentIds)

        if (stErr) {
            throw new Error(stErr.message)
        }

        for (const s of students ?? []) {
            if (typeof s.id !== "string") continue
            studentMap.set(s.id, {
                email: typeof s.email === "string" ? s.email : null,
                first_name: typeof s.first_name === "string" ? s.first_name : null,
                last_name: typeof s.last_name === "string" ? s.last_name : null,
            })
        }
    }

    for (const m of rows) {
        const profile = studentMap.get(m.student_id)
        const enriched: TheoryPlanningMemberWithStudent = {
            ...m,
            email: profile?.email ?? null,
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
        }
        const list = map.get(m.group_id) ?? []
        list.push(enriched)
        map.set(m.group_id, list)
    }

    return map
}

export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { searchParams } = new URL(req.url)
        const statusRaw = searchParams.get("status")?.trim().toLowerCase() ?? ""
        const slotRaw = searchParams.get("theory_slot")?.trim() ?? ""

        const supabase = createSupabaseServiceRoleClient()
        let query = supabase
            .from("theory_planning_groups")
            .select(THEORY_PLANNING_GROUP_SELECT)
            .order("created_at", { ascending: false })

        if (statusRaw) {
            if (!isTheoryPlanningStatus(statusRaw)) {
                return NextResponse.json(
                    {
                        error: "Invalid status. Allowed: draft, scheduled, completed, cancelled",
                        code: "validation_error",
                    },
                    { status: 400 }
                )
            }
            query = query.eq("status", statusRaw)
        }

        if (slotRaw) {
            const slot = parseTheorySlot(slotRaw)
            if (!slot) {
                return NextResponse.json(
                    { error: "Invalid theory_slot. Allowed: 1, 2", code: "validation_error" },
                    { status: 400 }
                )
            }
            query = query.eq("theory_slot", slot)
        }

        const { data, error } = await query
        if (error) {
            console.error("[api/admin/theory-planning/groups] GET", error.message)
            return NextResponse.json({ error: "Failed to load groups" }, { status: 500 })
        }

        const groups = (data ?? []) as TheoryPlanningGroupRow[]
        const membersByGroup = await loadMembersForGroups(groups.map((g) => g.id))

        return NextResponse.json({
            groups: groups.map((g) =>
                serializeTheoryPlanningGroup(g, {
                    members: membersByGroup.get(g.id) ?? [],
                    member_count: (membersByGroup.get(g.id) ?? []).length,
                })
            ),
        })
    } catch (e) {
        console.error("[api/admin/theory-planning/groups] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = createTheoryPlanningGroupSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const slot = parseTheorySlot(parsed.data.theory_slot)
        if (!slot) {
            return NextResponse.json(
                { error: "Invalid theory_slot. Allowed: 1, 2", code: "validation_error" },
                { status: 400 }
            )
        }

        const title =
            typeof parsed.data.title === "string" && parsed.data.title.trim()
                ? parsed.data.title.trim()
                : null
        const adminNotes =
            typeof parsed.data.admin_notes === "string" && parsed.data.admin_notes.trim()
                ? parsed.data.admin_notes.trim()
                : null

        const tentativeDate =
            typeof parsed.data.tentative_date === "string" ? parsed.data.tentative_date : null
        const tentativeTime =
            typeof parsed.data.tentative_time === "string"
                ? normalizePlanningTime(parsed.data.tentative_time)
                : null
        const confirmedDate =
            typeof parsed.data.confirmed_date === "string" ? parsed.data.confirmed_date : null
        const confirmedTime =
            typeof parsed.data.confirmed_time === "string"
                ? normalizePlanningTime(parsed.data.confirmed_time)
                : null

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("theory_planning_groups")
            .insert({
                title,
                status: "draft",
                theory_slot: slot,
                tentative_date: tentativeDate,
                tentative_time: tentativeTime,
                confirmed_date: confirmedDate,
                confirmed_time: confirmedTime,
                session_id: null,
                admin_notes: adminNotes,
                created_by_admin_email: auth.email,
                updated_by_admin_email: auth.email,
            })
            .select(THEORY_PLANNING_GROUP_SELECT)
            .single()

        if (error || !data) {
            console.error("[api/admin/theory-planning/groups] POST", error?.message)
            return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
        }

        return NextResponse.json(
            {
                group: serializeTheoryPlanningGroup(data as TheoryPlanningGroupRow, {
                    members: [],
                    member_count: 0,
                }),
            },
            { status: 201 }
        )
    } catch (e) {
        console.error("[api/admin/theory-planning/groups] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
