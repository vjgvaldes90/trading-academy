import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAdminPushVapidConfigured } from "@/lib/adminPush"
import { sendAdminTestPush } from "@/lib/adminPushSend"

export const runtime = "nodejs"

/**
 * Authenticated admin test push.
 * Reports provider acceptance only — not confirmed device display.
 * Does not create admin_notifications rows.
 */
export async function POST() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isAdminPushVapidConfigured()) {
            return NextResponse.json(
                { error: "Push notifications are not configured on the server" },
                { status: 503 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const result = await sendAdminTestPush(supabase, auth.email)

        if (result.attempted === 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No push subscriptions found for this admin",
                    attempted: 0,
                    accepted: 0,
                    removed: 0,
                },
                { status: 404 }
            )
        }

        if (result.accepted === 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Push provider did not accept the request for any subscription",
                    attempted: result.attempted,
                    accepted: 0,
                    removed: result.removed,
                },
                { status: 502 }
            )
        }

        return NextResponse.json({
            ok: true,
            attempted: result.attempted,
            accepted: result.accepted,
            removed: result.removed,
            note: "Accepted by the push provider. Device delivery is not confirmed.",
        })
    } catch (e) {
        console.error("[api/admin/push/test] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
