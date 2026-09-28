import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    GoogleDriveApiError,
    GoogleDriveConfigError,
    getGoogleDriveAccessToken,
    getGoogleWifDiagnostics,
    isGoogleWifConfigured,
    listSharedDriveFiles,
} from "@/lib/googleDrive"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Temporary admin-only Google Drive connectivity check (read-only).
 * - Without GOOGLE_SHARED_DRIVE_ID: verifies the WIF token exchange only.
 * - With GOOGLE_SHARED_DRIVE_ID: also reads Shared Drive metadata and counts first-page items.
 * Never returns tokens or credentials.
 */
export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isGoogleWifConfigured()) {
            return NextResponse.json(
                { success: false, stage: "config", error: "Google Workload Identity Federation env is incomplete" },
                { status: 503 }
            )
        }

        const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim() || ""

        if (!sharedDriveId) {
            await getGoogleDriveAccessToken(req.headers)
            return NextResponse.json({
                success: true,
                authenticated: true,
                driveChecked: false,
                note: "GOOGLE_SHARED_DRIVE_ID is not set; only the WIF token exchange was verified.",
            })
        }

        const listing = await listSharedDriveFiles(sharedDriveId, req.headers)
        return NextResponse.json({
            success: true,
            authenticated: true,
            driveChecked: true,
            sharedDrive: listing.drive,
            fileCount: listing.files.length,
            hasMore: listing.hasMore,
        })
    } catch (e) {
        if (e instanceof GoogleDriveConfigError) {
            return NextResponse.json(
                { success: false, stage: "config", error: e.message },
                { status: 503 }
            )
        }
        if (e instanceof GoogleDriveApiError) {
            return NextResponse.json(
                {
                    success: false,
                    stage: e.stage,
                    status: e.status,
                    googleCode: e.googleCode,
                    error: e.message,
                    ...(e.stage === "sts" ? { diagnostics: getGoogleWifDiagnostics() } : {}),
                },
                { status: 502 }
            )
        }
        console.error("[api/admin/google-drive/test] GET", e instanceof Error ? e.name : "unknown")
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
    }
}
