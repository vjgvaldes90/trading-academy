import { NextResponse } from "next/server"
import { Resend } from "resend"
import { isAuthorizedAdminEmail, normalizeUserEmail } from "@/lib/adminEmails"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getSiteBaseUrl } from "@/lib/supabaseMagicLink"

export const runtime = "nodejs"

type Body = { email?: unknown }

function adminCallbackUrl(): string {
    return `${getSiteBaseUrl()}/admin/auth/callback`
}

function buildEmailHtml(actionLink: string): string {
    return `
        <div style="font-family:Inter,Arial,sans-serif;background:#020617;color:#e2e8f0;padding:24px;">
            <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:22px;">
                <h1 style="margin:0 0 10px;font-size:22px;color:#f8fafc;">Smart Option Academy Admin Access</h1>
                <p style="margin:0 0 14px;color:#94a3b8;line-height:1.5;">
                    Use the secure link below to access the corporate admin dashboard.
                </p>
                <a href="${actionLink}" style="display:inline-block;background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#fff;text-decoration:none;font-weight:700;padding:11px 16px;border-radius:10px;">
                    Open Admin Dashboard
                </a>
                <p style="margin:14px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
                    If you did not request this login, you can ignore this email.
                </p>
            </div>
        </div>
    `
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null
        const email = normalizeUserEmail(typeof body?.email === "string" ? body.email : "")

        if (!email) {
            return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 })
        }
        if (!isAuthorizedAdminEmail(email)) {
            return NextResponse.json({ ok: false, error: "Unauthorized corporate account" }, { status: 403 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: adminCallbackUrl() },
        })
        if (error) {
            console.error("[api/admin/auth/request-link] generateLink", error)
            return NextResponse.json({ ok: false, error: "Failed to create login link" }, { status: 500 })
        }

        const actionLink = data?.properties?.action_link
        if (!actionLink || typeof actionLink !== "string") {
            return NextResponse.json({ ok: false, error: "Failed to create login link" }, { status: 500 })
        }

        const resendKey = process.env.RESEND_API_KEY?.trim()
        if (!resendKey) {
            return NextResponse.json({ ok: false, error: "Email service unavailable" }, { status: 503 })
        }
        const resend = new Resend(resendKey)
        const { error: sendErr } = await resend.emails.send({
            from: "Smart Option Academy <tony@smartoptionacademy.com>",
            to: email,
            subject: "Admin login · Smart Option Academy",
            html: buildEmailHtml(actionLink),
        })
        if (sendErr) {
            console.error("[api/admin/auth/request-link] resend", sendErr)
            return NextResponse.json({ ok: false, error: "Failed to send login email" }, { status: 502 })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error("[api/admin/auth/request-link]", e)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
