import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    PRIVATE_CLASS_REQUEST_SELECT,
    privateClassAdminActionSchema,
    privateClassRequestIdSchema,
    adminPrivateClassRequest,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Conditional UPDATE for race-safe transitions.
 * Filters on prior status so only one concurrent PATCH wins.
 */
async function transitionRequest(args: {
    id: string
    fromStatus: string
    patch: Record<string, unknown>
}): Promise<
    | { ok: true; row: PrivateClassRequestRow }
    | { ok: false; kind: "not_found" | "conflict" | "db"; message?: string; currentStatus?: string }
> {
    const supabase = createSupabaseServiceRoleClient()

    const { data: existing, error: loadErr } = await supabase
        .from("private_class_requests")
        .select("id, status")
        .eq("id", args.id)
        .maybeSingle()

    if (loadErr) {
        return { ok: false, kind: "db", message: loadErr.message }
    }
    if (!existing) {
        return { ok: false, kind: "not_found" }
    }

    const currentStatus = String(existing.status ?? "")
    if (currentStatus !== args.fromStatus) {
        return { ok: false, kind: "conflict", currentStatus }
    }

    const { data: updated, error: updateErr } = await supabase
        .from("private_class_requests")
        .update(args.patch)
        .eq("id", args.id)
        .eq("status", args.fromStatus)
        .select(PRIVATE_CLASS_REQUEST_SELECT)
        .maybeSingle()

    if (updateErr) {
        return { ok: false, kind: "db", message: updateErr.message }
    }
    if (!updated) {
        return { ok: false, kind: "conflict", currentStatus }
    }

    return { ok: true, row: updated as PrivateClassRequestRow }
}

export async function PATCH(req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id: rawId } = await context.params
        const idParsed = privateClassRequestIdSchema.safeParse(rawId)
        if (!idParsed.success) {
            return NextResponse.json({ error: "Invalid request id", code: "validation_error" }, { status: 400 })
        }
        const id = idParsed.data

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body", code: "validation_error" }, { status: 400 })
        }

        const parsed = privateClassAdminActionSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const { action } = parsed.data
        const notesRaw = parsed.data.admin_notes
        const adminNotes =
            typeof notesRaw === "string" && notesRaw.trim() !== "" ? notesRaw.trim() : undefined
        const nowIso = new Date().toISOString()

        if (action === "approve") {
            const result = await transitionRequest({
                id,
                fromStatus: "pending",
                patch: {
                    status: "awaiting_payment",
                    approved_by_admin_email: auth.email,
                    approved_at: nowIso,
                    ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
                },
            })

            if (!result.ok) {
                if (result.kind === "not_found") {
                    return NextResponse.json({ error: "Request not found", code: "not_found" }, { status: 404 })
                }
                if (result.kind === "conflict") {
                    return NextResponse.json(
                        {
                            error: "Only pending requests can be approved",
                            code: "invalid_transition",
                        },
                        { status: 409 }
                    )
                }
                console.error("[api/admin/private-class-requests/[id]] approve", result.message)
                return NextResponse.json({ error: "Failed to approve request" }, { status: 500 })
            }

            return NextResponse.json({ request: adminPrivateClassRequest(result.row) })
        }

        if (action === "reject") {
            const result = await transitionRequest({
                id,
                fromStatus: "pending",
                patch: {
                    status: "rejected",
                    rejected_by_admin_email: auth.email,
                    rejected_at: nowIso,
                    ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
                },
            })

            if (!result.ok) {
                if (result.kind === "not_found") {
                    return NextResponse.json({ error: "Request not found", code: "not_found" }, { status: 404 })
                }
                if (result.kind === "conflict") {
                    return NextResponse.json(
                        {
                            error: "Only pending requests can be rejected",
                            code: "invalid_transition",
                        },
                        { status: 409 }
                    )
                }
                console.error("[api/admin/private-class-requests/[id]] reject", result.message)
                return NextResponse.json({ error: "Failed to reject request" }, { status: 500 })
            }

            return NextResponse.json({ request: adminPrivateClassRequest(result.row) })
        }

        // cancel — load current status first for post-payment messaging
        const supabase = createSupabaseServiceRoleClient()
        const { data: existing, error: loadErr } = await supabase
            .from("private_class_requests")
            .select("id, status")
            .eq("id", id)
            .maybeSingle()

        if (loadErr) {
            console.error("[api/admin/private-class-requests/[id]] cancel load", loadErr.message)
            return NextResponse.json({ error: "Failed to load request" }, { status: 500 })
        }
        if (!existing) {
            return NextResponse.json({ error: "Request not found", code: "not_found" }, { status: 404 })
        }

        const status = String(existing.status ?? "")
        if (status === "paid" || status === "confirmed") {
            return NextResponse.json(
                {
                    error: "Post-payment cancellation will be implemented in a later stage",
                    code: "post_payment_cancel_not_implemented",
                },
                { status: 409 }
            )
        }
        if (status !== "pending" && status !== "awaiting_payment") {
            return NextResponse.json(
                {
                    error: `Cannot cancel a request in status "${status}"`,
                    code: "invalid_transition",
                },
                { status: 409 }
            )
        }

        const result = await transitionRequest({
            id,
            fromStatus: status,
            patch: {
                status: "cancelled",
                cancelled_at: nowIso,
                ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
            },
        })

        if (!result.ok) {
            if (result.kind === "not_found") {
                return NextResponse.json({ error: "Request not found", code: "not_found" }, { status: 404 })
            }
            if (result.kind === "conflict") {
                return NextResponse.json(
                    {
                        error: "Request status changed; cancel was not applied",
                        code: "invalid_transition",
                    },
                    { status: 409 }
                )
            }
            console.error("[api/admin/private-class-requests/[id]] cancel", result.message)
            return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 })
        }

        return NextResponse.json({ request: adminPrivateClassRequest(result.row) })
    } catch (e) {
        console.error("[api/admin/private-class-requests/[id]] PATCH", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
