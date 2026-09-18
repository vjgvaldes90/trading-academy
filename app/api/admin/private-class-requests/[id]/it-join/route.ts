import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { isAuthorizedItAdminEmail } from "@/lib/adminEmails"
import {
    PRIVATE_CLASS_REQUEST_SELECT,
    privateClassRequestIdSchema,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

const BLOCKED_STATUSES = new Set(["cancelled", "rejected"])

/**
 * IT-only participant join for private classes.
 * Returns `zoom_join_url` only — never zoom_start_url.
 * Does not touch Stripe, payment status, student access, or bookings.
 */
export async function POST(_req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isAuthorizedItAdminEmail(auth.email)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Forbidden — IT access only",
                    code: "it_only",
                },
                { status: 403 }
            )
        }

        const { id: rawId } = await context.params
        const idParsed = privateClassRequestIdSchema.safeParse(rawId)
        if (!idParsed.success) {
            return NextResponse.json(
                { ok: false, error: "Invalid request id", code: "validation_error" },
                { status: 400 }
            )
        }
        const requestId = idParsed.data

        const supabase = createSupabaseServiceRoleClient()
        const { data: existing, error: loadErr } = await supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        if (loadErr) {
            console.error("[api/admin/private-class-requests/it-join] load", loadErr.message)
            return NextResponse.json(
                { ok: false, error: "Failed to load private class request", code: "db_load_failed" },
                { status: 500 }
            )
        }
        if (!existing) {
            return NextResponse.json(
                { ok: false, error: "Request not found", code: "not_found" },
                { status: 404 }
            )
        }

        const row = existing as PrivateClassRequestRow
        const status = String(row.status ?? "").trim().toLowerCase()
        if (BLOCKED_STATUSES.has(status)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: `Cannot enter private class with status "${status}"`,
                    code: "invalid_status",
                    status,
                },
                { status: 403 }
            )
        }

        const joinUrl =
            typeof row.zoom_join_url === "string" && row.zoom_join_url.trim()
                ? row.zoom_join_url.trim()
                : ""
        if (!joinUrl) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No participant Zoom join URL configured for this private class",
                    code: "missing_meeting_link",
                },
                { status: 503 }
            )
        }

        console.log("[ADMIN PRIVATE CLASS IT JOIN SUCCESS]", {
            request_id: requestId,
            admin: auth.email,
            status,
            url_source: "zoom_join_url",
        })

        return NextResponse.json({
            ok: true,
            join_url: joinUrl,
        })
    } catch (e) {
        console.error("[api/admin/private-class-requests/it-join] POST", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}
