import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    PRIVATE_CLASS_REQUEST_SELECT,
    privateClassRequestIdSchema,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

const BLOCKED_STATUSES = new Set(["cancelled", "rejected"])

/**
 * IT/Admin secure enter for a private class Zoom meeting.
 * Auth: signed admin_session cookie only (never body email).
 * Does not touch Stripe, payment status, student access, or bookings.
 */
export async function POST(_req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response
        const verifiedAdmin = auth.email

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
            console.error("[api/admin/private-class-requests/host-join] load", loadErr.message)
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

        // Prefer host start URL (same as existing Admin "Start Zoom"); fall back to participant join.
        const startUrl =
            typeof row.zoom_start_url === "string" && row.zoom_start_url.trim()
                ? row.zoom_start_url.trim()
                : ""
        const joinUrl =
            typeof row.zoom_join_url === "string" && row.zoom_join_url.trim()
                ? row.zoom_join_url.trim()
                : ""
        const hostUrl = startUrl || joinUrl
        if (!hostUrl) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No Zoom meeting URL configured for this private class",
                    code: "missing_meeting_link",
                },
                { status: 503 }
            )
        }

        console.log("[ADMIN PRIVATE CLASS HOST JOIN SUCCESS]", {
            request_id: requestId,
            admin: verifiedAdmin,
            status,
            url_source: startUrl ? "zoom_start_url" : "zoom_join_url",
        })

        return NextResponse.json({
            ok: true,
            join_url: hostUrl,
            zoom_start_url: hostUrl,
        })
    } catch (e) {
        console.error("[api/admin/private-class-requests/host-join] POST", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}
