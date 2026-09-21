import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    THEORY_PLANNING_GROUP_SELECT,
    theoryPlanningGroupIdSchema,
} from "@/lib/theoryPlanning"
import { z } from "zod"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string; studentId: string }> }

const studentIdSchema = z.string().uuid()

export async function DELETE(_req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id: rawGroupId, studentId: rawStudentId } = await context.params
        const groupParsed = theoryPlanningGroupIdSchema.safeParse(rawGroupId)
        const studentParsed = studentIdSchema.safeParse(rawStudentId)
        if (!groupParsed.success || !studentParsed.success) {
            return NextResponse.json(
                { error: "Invalid group id or student id", code: "validation_error" },
                { status: 400 }
            )
        }
        const groupId = groupParsed.data
        const studentId = studentParsed.data

        const supabase = createSupabaseServiceRoleClient()
        const { data: group, error: groupErr } = await supabase
            .from("theory_planning_groups")
            .select(THEORY_PLANNING_GROUP_SELECT)
            .eq("id", groupId)
            .maybeSingle()

        if (groupErr) {
            console.error(
                "[api/admin/theory-planning/groups/[id]/members/[studentId]] DELETE group",
                groupErr.message
            )
            return NextResponse.json({ error: "Failed to load group" }, { status: 500 })
        }
        if (!group) {
            return NextResponse.json({ error: "Group not found", code: "not_found" }, { status: 404 })
        }

        const { data: deleted, error: delErr } = await supabase
            .from("theory_planning_group_members")
            .delete()
            .eq("group_id", groupId)
            .eq("student_id", studentId)
            .select("id, group_id, student_id")
            .maybeSingle()

        if (delErr) {
            console.error(
                "[api/admin/theory-planning/groups/[id]/members/[studentId]] DELETE",
                delErr.message
            )
            return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
        }
        if (!deleted) {
            return NextResponse.json(
                { error: "Member not found in this group", code: "not_found" },
                { status: 404 }
            )
        }

        // Touch group audit (planning only — no quota side effects).
        await supabase
            .from("theory_planning_groups")
            .update({ updated_by_admin_email: auth.email })
            .eq("id", groupId)

        return NextResponse.json({
            ok: true,
            removed: {
                group_id: groupId,
                student_id: studentId,
            },
        })
    } catch (e) {
        console.error(
            "[api/admin/theory-planning/groups/[id]/members/[studentId]] DELETE",
            e
        )
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
