import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { getAdminPushVapidPublicKey, isAdminPushVapidConfigured } from "@/lib/adminPush"

export const runtime = "nodejs"

/**
 * Returns the VAPID public key for authenticated admins.
 * Private key is never included.
 */
export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const publicKey = getAdminPushVapidPublicKey()
        if (!publicKey || !isAdminPushVapidConfigured()) {
            return NextResponse.json(
                { error: "Push notifications are not configured on the server" },
                { status: 503 }
            )
        }

        return NextResponse.json({ publicKey })
    } catch (e) {
        console.error("[api/admin/push/vapid-public-key] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
