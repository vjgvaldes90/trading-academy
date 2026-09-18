import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { generateAccessCode } from "@/lib/accessCode"
import { clearStudentSessionTokenInDb } from "@/lib/studentSingleSession"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_CODE_ATTEMPTS = 12

type RouteCtx = { params: Promise<{ email: string }> }

/**
 * Admin-only access code rotation.
 * Generates a new unique code, saves it, and clears session_token in the same UPDATE
 * (same fields as clearStudentSessionTokenInDb) so old sessions die immediately.
 * Does not log codes. Auth: admin_session cookie only.
 */
export async function POST(_req: Request, context: RouteCtx) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { email: rawParam } = await context.params
        const email = decodeURIComponent((rawParam ?? "").trim()).toLowerCase()

        if (!email || !EMAIL_RE.test(email)) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: existing, error: loadErr } = await supabase
            .from("trading_students")
            .select("id, email, access_code")
            .eq("email", email)
            .maybeSingle()

        if (loadErr) {
            console.error("[api/admin/students/rotate-access-code] load failed", {
                email,
                message: loadErr.message,
            })
            return NextResponse.json({ error: "Failed to load student" }, { status: 500 })
        }
        if (!existing) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        const previousCode =
            typeof existing.access_code === "string" && existing.access_code.trim()
                ? existing.access_code.trim()
                : null

        let newCode: string | null = null
        for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            const candidate = generateAccessCode()
            if (!candidate || candidate === previousCode) continue

            const { data: clash, error: clashErr } = await supabase
                .from("trading_students")
                .select("id")
                .eq("access_code", candidate)
                .neq("email", email)
                .maybeSingle()

            if (clashErr) {
                console.error("[api/admin/students/rotate-access-code] collision check failed", {
                    email,
                    message: clashErr.message,
                })
                return NextResponse.json(
                    { error: "Failed to generate a unique access code" },
                    { status: 500 }
                )
            }
            if (!clash) {
                newCode = candidate
                break
            }
        }

        if (!newCode) {
            return NextResponse.json(
                {
                    error: "Could not generate a unique access code. Try again.",
                    code: "code_generation_exhausted",
                },
                { status: 503 }
            )
        }

        // Atomic-ish: new code + session invalidation in one write (no RPC available).
        // Fields match clearStudentSessionTokenInDb so an old session cannot survive a code change.
        const nowIso = new Date().toISOString()
        const { data: updated, error: updateErr } = await supabase
            .from("trading_students")
            .update({
                access_code: newCode,
                session_token: null,
                session_updated_at: nowIso,
            })
            .eq("email", email)
            .select("id, email, access_code")
            .maybeSingle()

        if (updateErr || !updated) {
            console.error("[api/admin/students/rotate-access-code] update failed", {
                email,
                message: updateErr?.message ?? "no row",
            })
            return NextResponse.json({ error: "Failed to rotate access code" }, { status: 500 })
        }

        const savedCode =
            typeof updated.access_code === "string" && updated.access_code.trim()
                ? updated.access_code.trim()
                : ""
        if (!savedCode || savedCode !== newCode) {
            console.error("[api/admin/students/rotate-access-code] saved code mismatch", { email })
            return NextResponse.json({ error: "Failed to rotate access code" }, { status: 500 })
        }

        // Belt-and-suspenders: same helper used elsewhere to clear session_token.
        await clearStudentSessionTokenInDb(email)

        console.log("[ADMIN ACCESS CODE ROTATED]", {
            admin: auth.email,
            student_email: email,
            session_invalidated: true,
        })

        return NextResponse.json({
            ok: true,
            email,
            access_code: savedCode,
            session_invalidated: true,
        })
    } catch (e) {
        console.error("[api/admin/students/rotate-access-code] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
