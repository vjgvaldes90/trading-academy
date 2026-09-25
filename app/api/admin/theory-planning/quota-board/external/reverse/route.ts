import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REASON_MAX = 1000

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
 * Admin-only: soft-reverse an external Theory consumption via reverse_theory_external_consumption.
 * Never hard-deletes; never UPDATEs the ledger from TypeScript.
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
        const externalConsumptionId = trimString(b.external_consumption_id)
        const reversalReason = trimString(b.reversal_reason)

        if (!externalConsumptionId || !UUID_RE.test(externalConsumptionId)) {
            return NextResponse.json(
                {
                    ok: false,
                    code: "invalid_args",
                    error: "external_consumption_id must be a valid uuid",
                },
                { status: 400 }
            )
        }
        if (!reversalReason) {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "reversal_reason is required" },
                { status: 400 }
            )
        }
        if (reversalReason.length > REASON_MAX) {
            return NextResponse.json(
                {
                    ok: false,
                    code: "invalid_args",
                    error: `reversal_reason must be at most ${REASON_MAX} characters`,
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: rpcData, error: rpcError } = await supabase.rpc(
            "reverse_theory_external_consumption",
            {
                p_external_id: externalConsumptionId,
                p_reversed_by_admin_email: auth.email,
                p_reversal_reason: reversalReason,
            }
        )

        if (rpcError) {
            console.error(
                "[api/admin/theory-planning/quota-board/external/reverse] reverse_theory_external_consumption",
                rpcError.message
            )
            if (isMissingRpcOrRelationError(rpcError.message)) {
                return NextResponse.json(
                    {
                        ok: false,
                        code: "unavailable",
                        error: "External theory reversal is not available yet",
                    },
                    { status: 503 }
                )
            }
            return NextResponse.json(
                { ok: false, code: "reverse_failed", error: "Failed to reverse external class" },
                { status: 500 }
            )
        }

        const parsed = parseRpcStatus(rpcData)
        const status = parsed.status

        if (status === "ok") {
            return NextResponse.json({
                ok: true,
                status: "ok",
                id: parsed.id ?? externalConsumptionId,
                total: parsed.total ?? null,
                academy: parsed.academy ?? null,
                external: parsed.external ?? null,
            })
        }

        if (status === "not_found") {
            return NextResponse.json(
                { ok: false, code: "not_found", error: "External consumption not found" },
                { status: 404 }
            )
        }
        if (status === "already_reversed") {
            return NextResponse.json(
                {
                    ok: false,
                    code: "already_reversed",
                    error: "External consumption already reversed",
                    id: parsed.id ?? externalConsumptionId,
                },
                { status: 409 }
            )
        }
        if (status === "invalid_args") {
            return NextResponse.json(
                { ok: false, code: "invalid_args", error: "Invalid reversal arguments" },
                { status: 400 }
            )
        }

        console.error(
            "[api/admin/theory-planning/quota-board/external/reverse] unexpected rpc status",
            status || rpcData
        )
        return NextResponse.json(
            { ok: false, code: "reverse_failed", error: "Failed to reverse external class" },
            { status: 500 }
        )
    } catch (e) {
        console.error("[api/admin/theory-planning/quota-board/external/reverse] POST", e)
        return NextResponse.json(
            { ok: false, code: "reverse_failed", error: "Internal error" },
            { status: 500 }
        )
    }
}
