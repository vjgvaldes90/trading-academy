import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import {
    RECORDED_CLASSES_BUCKET,
    RECORDED_CLASS_SIGNED_URL_SECONDS,
} from "@/lib/recordedLessons"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
    params: Promise<{ id: string }>
}

/**
 * Temporary signed playback URL for uploaded lessons.
 * Never accepts a client-supplied storage_path — path comes from lessons row only.
 */
export async function GET(_req: Request, context: RouteContext) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: rawId } = await context.params
        const id = typeof rawId === "string" ? rawId.trim() : ""
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid lesson id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        if (!isAuthorizedAdminEmail(email)) {
            const { data: row, error: accessErr } = await supabase
                .from("trading_students")
                .select(
                    "access_code, access_type, is_active, access_expires_at, subscription_id, subscription_status"
                )
                .eq("email", email)
                .maybeSingle()

            if (accessErr) {
                console.error("[api/lessons/video] access lookup", accessErr.message)
                return NextResponse.json({ error: "Access check failed" }, { status: 500 })
            }

            const academyEv = evaluateAcademyAccess(row as TradingStudentAccessRow | null)
            if (!academyEv.ok) {
                return NextResponse.json(
                    {
                        error: "Academy access denied",
                        reason: academyEv.reason ?? "not_found",
                    },
                    { status: 403 }
                )
            }
        }

        const { data: lesson, error: lessonErr } = await supabase
            .from("lessons")
            .select("id, source_type, storage_path, is_published")
            .eq("id", id)
            .maybeSingle()

        if (lessonErr) {
            console.error("[api/lessons/video] lesson lookup", lessonErr.message)
            return NextResponse.json({ error: "Failed to load lesson" }, { status: 500 })
        }
        if (!lesson || lesson.is_published !== true) {
            return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
        }
        if (lesson.source_type !== "upload") {
            return NextResponse.json(
                { error: "Lesson is not an uploaded video", code: "not_upload" },
                { status: 400 }
            )
        }

        const storagePath =
            typeof lesson.storage_path === "string" ? lesson.storage_path.trim() : ""
        if (!storagePath) {
            return NextResponse.json({ error: "Lesson storage path missing" }, { status: 500 })
        }

        const { data: signed, error: signErr } = await supabase.storage
            .from(RECORDED_CLASSES_BUCKET)
            .createSignedUrl(storagePath, RECORDED_CLASS_SIGNED_URL_SECONDS)

        if (signErr || !signed?.signedUrl) {
            console.error("[api/lessons/video] createSignedUrl", signErr?.message)
            return NextResponse.json(
                { error: "Failed to create playback URL" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            ok: true,
            url: signed.signedUrl,
            expires_in: RECORDED_CLASS_SIGNED_URL_SECONDS,
        })
    } catch (e) {
        console.error("[api/lessons/video] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
