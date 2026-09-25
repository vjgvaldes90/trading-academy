import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const NOTES_MAX = 2000

function trimString(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

function isMissingRpcOrRelationError(message: string): boolean {
    const m = message.toLowerCase()
    return (
        m.includes("does not exist") ||
        m.includes("could not find the function") ||
        m.includes("could not find the table") ||
        m.includes("schema cache") ||
        m.includes("could not find the relationship")
    )
}

function parseRpcStatus(data: unknown): {
    status: string
    id?: string
    total?: number
    academy?: number
    external?: number
} {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return { status: "" }
    }
    const row = data as Record<string, unknown>
    const status = typeof row.status === "string" ? row.status.trim() : ""
    const id = typeof row.id === "string" ? row.id : undefined
    const total = typeof row.total === "number" && Number.isFinite(row.total) ? row.total : undefined
    const academy =
        typeof row.academy === "number" && Number.isFinite(row.academy) ? row.academy : undefined
    const external =
        typeof row.external === "number" && Number.isFinite(row.external) ? row.external : undefined
    return { status, id, total, academy, external }
}

/**
 * Admin-only: register one external Theory class via claim_theory_external_consumption.
 * Does not INSERT ledger rows from TypeScript; RPC is authoritative.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "Invalid JSON body" },
                { status: 400 }
            )
        }

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "Request body must be a JSON object" },
                { status: 400 }
            )
        }

        const b = body as Record<string, unknown>
        const studentId = trimString(b.student_id)
        const classHeldOn = trimString(b.class_held_on)
        const notesRaw = typeof b.notes === "string" ? b.notes.trim() : ""
        const notes = notesRaw.length > 0 ? notesRaw : null

        if (!studentId || !UUID_RE.test(studentId)) {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "student_id must be a valid uuid" },
                { status: 400 }
            )
        }
        if (!classHeldOn || !DATE_RE.test(classHeldOn)) {
            return NextResponse.json(
                {
                    ok: false,
                    code: "invalid_args",
                    error: "class_held_on must be a calendar date (YYYY-MM-DD)",
                },
                { status: 400 }
            )
        }
        // Reject clearly invalid calendar values (e.g. 2026-13-40).
        const heldMs = Date.parse(`${classHeldOn}T00:00:00.000Z`)
        if (!Number.isFinite(heldMs)) {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "class_held_on is not a valid date" },
                { status: 400 }
            )
        }
        if (notes && notes.length > NOTES_MAX) {
            return NextResponse.json(
                {
                    ok: false,
                    code: "invalid_args",
                    error: `notes must be at most ${NOTES_MAX} characters`,
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()

        // Reload student so we fail closed on missing ids before calling the RPC.
        // Eligibility / Free / period / quota remain RPC-authoritative.
        const { data: student, error: studentError } = await supabase
            .from("trading_students")
            .select("id")
            .eq("id", studentId)
            .maybeSingle()

        if (studentError) {
            console.error(
                "[api/admin/theory-planning/quota-board/external] student lookup",
                studentError.message
            )
            return NextResponse.json(
                { ok: false, code: "claim_failed", error: "Failed to register external class" },
                { status: 500 }
            )
        }
        if (!student?.id) {
            return NextResponse.json(
                { ok: false, code: "student_not_found", error: "Student not found" },
                { status: 404 }
            )
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc(
            "claim_theory_external_consumption",
            {
                p_student_id: studentId,
                p_class_held_on: classHeldOn,
                p_notes: notes,
                p_recorded_by_admin_email: auth.email,
            }
        )

        if (rpcError) {
            console.error(
                "[api/admin/theory-planning/quota-board/external] claim_theory_external_consumption",
                rpcError.message
            )
            if (isMissingRpcOrRelationError(rpcError.message)) {
                return NextResponse.json(
                    {
                        ok: false,
                        code: "unavailable",
                        error: "External theory registration is not available yet",
                    },
                    { status: 503 }
                )
            }
            return NextResponse.json(
                { ok: false, code: "claim_failed", error: "Failed to register external class" },
                { status: 500 }
            )
        }

        const parsed = parseRpcStatus(rpcData)
        const status = parsed.status

        if (status === "ok") {
            return NextResponse.json({
                ok: true,
                status: "ok",
                id: parsed.id ?? null,
                total: parsed.total ?? null,
                academy: parsed.academy ?? null,
                external: parsed.external ?? null,
            })
        }

        if (status === "quota_exceeded") {
            return NextResponse.json(
                {
                    ok: false,
                    code: "quota_exceeded",
                    error: "Theory quota exceeded",
                    total: parsed.total ?? null,
                    academy: parsed.academy ?? null,
                    external: parsed.external ?? null,
                },
                { status: 409 }
            )
        }
        if (status === "free_not_allowed") {
            return NextResponse.json(
                { ok: false, code: "free_not_allowed", error: "Free students cannot register external theory" },
                { status: 403 }
            )
        }
        if (status === "not_full_program") {
            return NextResponse.json(
                {
                    ok: false,
                    code: "not_full_program",
                    error: "Student is not on an eligible Full Program plan",
                },
                { status: 403 }
            )
        }
        if (status === "period_not_configured") {
            return NextResponse.json(
                {
                    ok: false,
                    code: "period_not_configured",
                    error: "Theory quota period is not configured",
                },
                { status: 409 }
            )
        }
        if (status === "student_not_found") {
            return NextResponse.json(
                { ok: false, code: "student_not_found", error: "Student not found" },
                { status: 404 }
            )
        }
        if (status === "invalid_args") {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "Invalid registration arguments" },
                { status: 400 }
            )
        }

        console.error(
            "[api/admin/theory-planning/quota-board/external] unexpected rpc status",
            status || rpcData
        )
        return NextResponse.json(
            { ok: false, code: "claim_failed", error: "Failed to register external class" },
            { status: 500 }
        )
    } catch (e) {
        console.error("[api/admin/theory-planning/quota-board/external] POST", e)
        return NextResponse.json(
            { ok: false, code: "claim_failed", error: "Internal error" },
            { status: 500 }
        )
    }
}
