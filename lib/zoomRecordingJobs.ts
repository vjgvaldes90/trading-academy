/**
 * Stage 1: Zoom cloud recording → Google Drive (Shared Drive, Trading/Theory folder).
 * Server-only. Uses the service-role client. Does NOT touch lessons.
 *
 * Never logs or persists Zoom download tokens, Google tokens, or Drive session URIs in logs
 * (the session URI is stored only in zoom_recording_jobs, which is service-role only).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
    GOOGLE_DRIVE_SCOPE,
    GoogleDriveApiError,
    GoogleDriveConfigError,
    findDriveFileByAppProperty,
    getDriveFileMetadata,
    getSharedDriveFolder,
    invalidateGoogleDriveAccessToken,
    queryResumableUploadStatus,
    startResumableUpload,
    uploadResumableChunk,
    type DriveFileMetadata,
    type ResumableUploadState,
} from "@/lib/googleDrive"
import {
    ZoomApiError,
    ZoomConfigError,
    extractZoomMeetingIdFromUrl,
    getZoomMeetingRecordings,
    openZoomRecordingDownload,
    parseZoomRecordingFiles,
    type ZoomRecordingFile,
} from "@/lib/zoom"

const JOBS_TABLE = "zoom_recording_jobs"
const JOB_SELECT =
    "id, session_id, zoom_meeting_id, zoom_meeting_uuid, zoom_recording_file_id, recording_type, file_size, " +
    "recording_start, status, attempts, next_attempt_at, locked_at, last_error, drive_upload_session_uri, " +
    "bytes_uploaded, drive_file_id"

/** Multiple of 256 KiB (Drive resumable requirement for non-final chunks). */
const CHUNK_BYTES = 32 * 1024 * 1024
/** Internal processing budget per invocation (route maxDuration is 300 s). */
export const ZOOM_RECORDING_BUDGET_MS = 240_000
const MAX_FAILED_ATTEMPTS = 6
const BACKOFF_MINUTES = [1, 5, 15, 30, 60]
const LEASE_STALE_MS = 15 * 60_000
const DAY_MS = 86_400_000
const TRANSIENT_RETRIES = 3
const MAX_ERROR_LENGTH = 300
const DRIVE_APP_PROPERTY_KEY = "zoomRecordingFileId"

const PREFERRED_RECORDING_TYPES = [
    "shared_screen_with_speaker_view",
    "shared_screen_with_speaker_view(CDN)",
    "speaker_view",
    "shared_screen_with_gallery_view",
    "active_speaker",
    "gallery_view",
    "shared_screen",
]

type JobStatus = "pending" | "processing" | "uploaded" | "failed" | "skipped"

type ZoomRecordingJobRow = {
    id: string
    session_id: string | null
    zoom_meeting_id: string
    zoom_meeting_uuid: string | null
    zoom_recording_file_id: string
    recording_type: string | null
    file_size: number | null
    recording_start: string | null
    status: JobStatus
    attempts: number
    next_attempt_at: string | null
    locked_at: string | null
    last_error: string | null
    drive_upload_session_uri: string | null
    bytes_uploaded: number
    drive_file_id: string | null
}

type SessionMatchRow = {
    id: string
    link: string | null
    date: string | null
    session_type: string | null
    status: string | null
}

/** Error whose message is safe to persist in last_error and to log. */
class RecordingJobError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "RecordingJobError"
    }
}

/** Download token from the webhook — in memory only, never persisted. */
export type ZoomDownloadHint = {
    downloadUrl: string
    downloadToken: string
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

function safeErrorMessage(e: unknown): string {
    let msg: string
    if (e instanceof GoogleDriveApiError) {
        msg = `${e.message}${e.googleCode ? ` [${e.googleCode}]` : ""}`
    } else if (
        e instanceof RecordingJobError ||
        e instanceof GoogleDriveConfigError ||
        e instanceof ZoomApiError ||
        e instanceof ZoomConfigError
    ) {
        msg = e.message
    } else if (e instanceof Error) {
        msg = `Unexpected error (${e.name})`
    } else {
        msg = "Unexpected error"
    }
    return msg.slice(0, MAX_ERROR_LENGTH)
}

function isNetworkError(e: unknown): boolean {
    return (
        e instanceof TypeError ||
        (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError"))
    )
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Webhook registration
// ---------------------------------------------------------------------------

function pickRecordingMp4(files: ZoomRecordingFile[]): ZoomRecordingFile | null {
    const candidates = files.filter(
        (f) => f.fileType === "MP4" && f.status === "completed" && f.id !== "" && f.downloadUrl !== "" && f.fileSize > 0
    )
    for (const type of PREFERRED_RECORDING_TYPES) {
        const match = candidates.find((f) => f.recordingType === type)
        if (match) return match
    }
    return [...candidates].sort((a, b) => b.fileSize - a.fileSize)[0] ?? null
}

/** Recording day (UTC) within ±1 calendar day of sessions.date (YYYY-MM-DD). */
function isRecordingNearSessionDate(recordingStart: string, sessionDate: string | null): boolean {
    const ymd = typeof sessionDate === "string" ? sessionDate.slice(0, 10) : ""
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
    if (!m) return false
    const recMs = Date.parse(recordingStart)
    if (!Number.isFinite(recMs)) return false
    const rec = new Date(recMs)
    const recDay = Date.UTC(rec.getUTCFullYear(), rec.getUTCMonth(), rec.getUTCDate())
    const sessionDay = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return Math.abs(recDay - sessionDay) <= DAY_MS
}

export type RegisterZoomRecordingResult =
    | { outcome: "ignored"; reason: string }
    | { outcome: "duplicate" }
    | { outcome: "created"; jobId: string; status: "pending" | "skipped"; downloadHint: ZoomDownloadHint | null }

/**
 * `recording.completed`: match a normal active session by Zoom meeting ID (from sessions.link),
 * exclude Private Classes, pick one MP4, and insert an idempotent job.
 */
export async function registerZoomRecordingFromWebhook(
    supabase: SupabaseClient,
    body: unknown
): Promise<RegisterZoomRecordingResult> {
    const root = asRecord(body)
    const object = asRecord(asRecord(root.payload).object)

    const rawId = object.id
    const meetingId =
        typeof rawId === "number" && Number.isFinite(rawId) ? String(Math.trunc(rawId)) : asString(rawId)
    if (!/^\d{8,15}$/.test(meetingId)) {
        return { outcome: "ignored", reason: "invalid_meeting_id" }
    }
    const meetingUuid = asString(object.uuid) || null

    const { data: privateRows, error: privateErr } = await supabase
        .from("private_class_requests")
        .select("id")
        .eq("zoom_meeting_id", meetingId)
        .limit(1)
    if (privateErr) {
        throw new Error(`private_class_lookup_failed:${privateErr.message}`)
    }
    if (Array.isArray(privateRows) && privateRows.length > 0) {
        console.log("[ZOOM RECORDING] ignored private class meeting", { meetingId })
        return { outcome: "ignored", reason: "private_class" }
    }

    const { data: sessionRows, error: sessionErr } = await supabase
        .from("sessions")
        .select("id, link, date, session_type, status")
        .eq("status", "active")
        .ilike("link", `%${meetingId}%`)
    if (sessionErr) {
        throw new Error(`session_lookup_failed:${sessionErr.message}`)
    }
    const matches = ((sessionRows ?? []) as SessionMatchRow[]).filter(
        (s) => extractZoomMeetingIdFromUrl(s.link) === meetingId
    )
    if (matches.length === 0) {
        console.log("[ZOOM RECORDING] ignored: no matching active session", { meetingId })
        return { outcome: "ignored", reason: "no_matching_session" }
    }
    if (matches.length > 1) {
        console.error("[ZOOM RECORDING] ignored: ambiguous session match", { meetingId, count: matches.length })
        return { outcome: "ignored", reason: "ambiguous_session" }
    }
    const session = matches[0]

    const file = pickRecordingMp4(parseZoomRecordingFiles(object.recording_files))
    if (!file) {
        console.log("[ZOOM RECORDING] ignored: no completed MP4", { meetingId, sessionId: session.id })
        return { outcome: "ignored", reason: "no_completed_mp4" }
    }

    const recordingStartRaw = file.recordingStart || asString(object.start_time)
    const recordingStartMs = Date.parse(recordingStartRaw)
    const dateOk = isRecordingNearSessionDate(recordingStartRaw, session.date)
    const status: "pending" | "skipped" = dateOk ? "pending" : "skipped"

    const { data: inserted, error: insertErr } = await supabase
        .from(JOBS_TABLE)
        .insert({
            session_id: session.id,
            zoom_meeting_id: meetingId,
            zoom_meeting_uuid: meetingUuid,
            zoom_recording_file_id: file.id,
            recording_type: file.recordingType || null,
            file_size: file.fileSize,
            recording_start: Number.isFinite(recordingStartMs) ? new Date(recordingStartMs).toISOString() : null,
            status,
            last_error: dateOk ? null : "date_mismatch",
            next_attempt_at: dateOk ? new Date().toISOString() : null,
        })
        .select("id")
        .single()

    if (insertErr) {
        if (insertErr.code === "23505") {
            console.log("[ZOOM RECORDING] duplicate recording ignored", {
                meetingId,
                recordingFileId: file.id,
            })
            return { outcome: "duplicate" }
        }
        throw new Error(`job_insert_failed:${insertErr.message}`)
    }

    const jobId = String((inserted as { id: string }).id)
    console.log("[ZOOM RECORDING JOB] created", {
        jobId,
        sessionId: session.id,
        meetingId,
        recordingFileId: file.id,
        recordingType: file.recordingType,
        fileSize: file.fileSize,
        status,
    })

    const downloadToken = asString(root.download_token)
    return {
        outcome: "created",
        jobId,
        status,
        downloadHint: dateOk && downloadToken ? { downloadUrl: file.downloadUrl, downloadToken } : null,
    }
}

// ---------------------------------------------------------------------------
// Job state transitions
// ---------------------------------------------------------------------------

function dueJobsFilter(now: Date): string {
    const nowIso = now.toISOString()
    const staleIso = new Date(now.getTime() - LEASE_STALE_MS).toISOString()
    return (
        `status.eq.pending,` +
        `and(status.eq.failed,next_attempt_at.lte."${nowIso}"),` +
        `and(status.eq.processing,locked_at.lt."${staleIso}")`
    )
}

/** Atomic lease: pending / due failed / stale processing → processing. */
async function leaseJob(supabase: SupabaseClient, jobId: string): Promise<ZoomRecordingJobRow | null> {
    const now = new Date()
    const { data, error } = await supabase
        .from(JOBS_TABLE)
        .update({ status: "processing", locked_at: now.toISOString() })
        .eq("id", jobId)
        .or(dueJobsFilter(now))
        .select(JOB_SELECT)
        .maybeSingle()
    if (error) {
        throw new Error(`job_lease_failed:${error.message}`)
    }
    return (data as ZoomRecordingJobRow | null) ?? null
}

async function updateJob(supabase: SupabaseClient, jobId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from(JOBS_TABLE).update(patch).eq("id", jobId)
    if (error) {
        throw new Error(`job_update_failed:${error.message}`)
    }
}

async function markJobFailed(supabase: SupabaseClient, job: ZoomRecordingJobRow, e: unknown): Promise<void> {
    const attempts = job.attempts + 1
    const exhausted = attempts >= MAX_FAILED_ATTEMPTS
    const backoffMin = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]
    const lastError = safeErrorMessage(e)
    try {
        await updateJob(supabase, job.id, {
            status: "failed",
            attempts,
            locked_at: null,
            next_attempt_at: exhausted ? null : new Date(Date.now() + backoffMin * 60_000).toISOString(),
            last_error: lastError,
        })
    } catch (updateErr) {
        console.error("[ZOOM RECORDING JOB] failed to persist failure", {
            jobId: job.id,
            error: safeErrorMessage(updateErr),
        })
    }
    console.error("[ZOOM RECORDING JOB] failed", {
        jobId: job.id,
        sessionId: job.session_id,
        meetingId: job.zoom_meeting_id,
        recordingFileId: job.zoom_recording_file_id,
        attempts,
        exhausted,
        error: lastError,
    })
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

type DriveTarget = {
    sharedDriveId: string
    folderId: string
    sessionType: "trading" | "theory"
    sessionDate: string
}

async function resolveDriveTarget(
    supabase: SupabaseClient,
    job: ZoomRecordingJobRow,
    headers: Headers
): Promise<DriveTarget> {
    if (!job.session_id) {
        throw new RecordingJobError("Job has no session")
    }
    const { data: session, error } = await supabase
        .from("sessions")
        .select("id, session_type, date")
        .eq("id", job.session_id)
        .maybeSingle()
    if (error) {
        throw new RecordingJobError("Failed to load session")
    }
    if (!session) {
        throw new RecordingJobError("Session not found")
    }
    const row = session as { session_type: string | null; date: string | null }
    const sessionType = row.session_type === "theory" ? "theory" : row.session_type === "trading" ? "trading" : null
    if (!sessionType) {
        throw new RecordingJobError("Unsupported session type")
    }

    const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim() || ""
    if (!sharedDriveId) {
        throw new RecordingJobError("GOOGLE_SHARED_DRIVE_ID is not configured")
    }
    const folderEnv = sessionType === "theory" ? "GOOGLE_DRIVE_THEORY_FOLDER_ID" : "GOOGLE_DRIVE_TRADING_FOLDER_ID"
    const folderId = process.env[folderEnv]?.trim() || ""
    if (!folderId) {
        throw new RecordingJobError(`${folderEnv} is not configured`)
    }

    const folder = await getSharedDriveFolder(folderId, sharedDriveId, headers)
    return {
        sharedDriveId,
        folderId: folder.id,
        sessionType,
        sessionDate: typeof row.date === "string" ? row.date.slice(0, 10) : "",
    }
}

function buildDriveFileName(target: DriveTarget, job: ZoomRecordingJobRow): string {
    const label = target.sessionType === "theory" ? "Theory Class" : "Trading Class"
    const date = target.sessionDate || (job.recording_start ?? "").slice(0, 10) || "unknown-date"
    const suffix = job.zoom_recording_file_id.replace(/[^A-Za-z0-9]/g, "").slice(0, 8)
    return `${label} - ${date} - ${suffix}.mp4`
}

async function verifyDriveFile(
    fileId: string,
    sharedDriveId: string,
    expectedBytes: number,
    headers: Headers
): Promise<DriveFileMetadata> {
    const meta = await getDriveFileMetadata(fileId, headers)
    if (meta.driveId !== sharedDriveId) {
        throw new RecordingJobError("Uploaded file is not in the configured Shared Drive")
    }
    if (meta.trashed) {
        throw new RecordingJobError("Uploaded file is in the trash")
    }
    if (meta.size !== expectedBytes) {
        throw new RecordingJobError(`Drive size mismatch (drive=${meta.size}, zoom=${expectedBytes})`)
    }
    return meta
}

async function markJobUploaded(
    supabase: SupabaseClient,
    job: ZoomRecordingJobRow,
    meta: DriveFileMetadata,
    totalBytes: number
): Promise<void> {
    await updateJob(supabase, job.id, {
        status: "uploaded",
        locked_at: null,
        next_attempt_at: null,
        last_error: null,
        drive_file_id: meta.id,
        bytes_uploaded: totalBytes,
    })
}

/** Leave the job ready for the next invocation without consuming an attempt. */
async function markJobContinuation(supabase: SupabaseClient, jobId: string, bytesUploaded: number): Promise<void> {
    await updateJob(supabase, jobId, {
        status: "pending",
        locked_at: null,
        next_attempt_at: new Date().toISOString(),
        bytes_uploaded: bytesUploaded,
    })
}

function isDriveSessionGone(e: unknown): boolean {
    return e instanceof GoogleDriveApiError && (e.status === 404 || e.status === 410)
}

/** Retry transient Drive/network failures (5xx, 429, network) with exponential backoff. */
async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
    let authRetried = false
    for (let attempt = 0; ; attempt++) {
        try {
            return await fn()
        } catch (e) {
            const status = e instanceof GoogleDriveApiError ? e.status : 0
            if (status === 401 && !authRetried) {
                authRetried = true
                invalidateGoogleDriveAccessToken(GOOGLE_DRIVE_SCOPE)
                continue
            }
            const transient = status === 429 || status >= 500 || isNetworkError(e)
            if (!transient || attempt >= TRANSIENT_RETRIES) throw e
            await sleep(1000 * 2 ** (attempt + 1))
        }
    }
}

async function openRecordingStream(
    job: ZoomRecordingJobRow,
    hint: ZoomDownloadHint | null,
    rangeStart: number,
    deadlineMs: number
): Promise<Response> {
    const timeoutMs = Math.max(30_000, deadlineMs - Date.now() + 45_000)

    if (hint) {
        const res = await openZoomRecordingDownload({
            downloadUrl: hint.downloadUrl,
            downloadToken: hint.downloadToken,
            rangeStart,
            timeoutMs,
        })
        if (res.ok) return res
        await res.body?.cancel()
        console.log("[ZOOM RECORDING JOB] webhook download token rejected; refreshing via API", {
            jobId: job.id,
            status: res.status,
        })
    }

    if (!job.zoom_meeting_uuid) {
        throw new RecordingJobError("Zoom meeting UUID missing")
    }
    const recordings = await getZoomMeetingRecordings(job.zoom_meeting_uuid)
    const file = recordings.files.find((f) => f.id === job.zoom_recording_file_id)
    if (!file || !file.downloadUrl) {
        throw new RecordingJobError("Recording file is no longer available in Zoom")
    }
    const res = await openZoomRecordingDownload({
        downloadUrl: file.downloadUrl,
        downloadToken: recordings.downloadAccessToken,
        rangeStart,
        timeoutMs,
    })
    if (!res.ok) {
        await res.body?.cancel()
        throw new RecordingJobError(`Zoom recording download failed (${res.status})`)
    }
    return res
}

/** Bytes to discard from the stream start (Zoom ignored or mis-honored the Range request). */
function bytesToSkip(res: Response, rangeStart: number): number {
    if (rangeStart === 0) return 0
    if (res.status !== 206) return rangeStart
    const m = /bytes\s+(\d+)-/i.exec(res.headers.get("content-range") || "")
    if (!m || Number(m[1]) !== rangeStart) {
        throw new RecordingJobError("Zoom returned an unexpected byte range")
    }
    return 0
}

type StreamOutcome = { kind: "done"; file: DriveFileMetadata } | { kind: "continued"; bytesUploaded: number }

async function streamZoomToDrive(input: {
    supabase: SupabaseClient
    job: ZoomRecordingJobRow
    res: Response
    sessionUri: string
    startOffset: number
    totalBytes: number
    headers: Headers
    deadlineMs: number
}): Promise<StreamOutcome> {
    const { supabase, job, res, sessionUri, totalBytes, headers, deadlineMs } = input
    if (!res.body) {
        throw new RecordingJobError("Zoom download has no body")
    }
    const reader = res.body.getReader()
    const buffer = new Uint8Array(CHUNK_BYTES)
    let fill = 0
    let offset = input.startOffset
    let skip = bytesToSkip(res, offset)
    const upload: { file: DriveFileMetadata | null } = { file: null }

    /** Send buffer[0..fill) at `offset`; keeps any bytes Drive did not accept. */
    const flush = async (isFinal: boolean): Promise<void> => {
        let noProgress = 0
        let transient = 0
        let authRetried = false
        while (fill > 0 && !upload.file) {
            let state: ResumableUploadState
            try {
                state = await uploadResumableChunk({
                    sessionUri,
                    chunk: buffer.subarray(0, fill),
                    start: offset,
                    totalBytes,
                    headers,
                })
            } catch (e) {
                const status = e instanceof GoogleDriveApiError ? e.status : 0
                if (status === 401 && !authRetried) {
                    authRetried = true
                    invalidateGoogleDriveAccessToken(GOOGLE_DRIVE_SCOPE)
                    continue
                }
                if (isDriveSessionGone(e)) {
                    await updateJob(supabase, job.id, { drive_upload_session_uri: null, bytes_uploaded: 0 })
                    throw new RecordingJobError("Google Drive upload session expired; a new session will be started")
                }
                const isTransient = status === 429 || status >= 500 || isNetworkError(e)
                if (!isTransient || transient >= TRANSIENT_RETRIES) throw e
                transient++
                await sleep(1000 * 2 ** transient)
                state = await queryResumableUploadStatus({ sessionUri, totalBytes, headers })
            }

            if (state.done) {
                upload.file = state.file
                offset = totalBytes
                fill = 0
                return
            }
            const accepted = state.nextOffset - offset
            if (accepted < 0 || accepted > fill) {
                throw new RecordingJobError("Google Drive reported an unexpected upload offset")
            }
            if (accepted === 0) {
                noProgress++
                if (noProgress > 2) throw new RecordingJobError("Google Drive upload made no progress")
            } else {
                buffer.copyWithin(0, accepted, fill)
                fill -= accepted
                offset = state.nextOffset
                noProgress = 0
            }
            if (!isFinal && fill < CHUNK_BYTES) return
        }
    }

    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            let bytes: Uint8Array = value
            if (skip > 0) {
                if (bytes.byteLength <= skip) {
                    skip -= bytes.byteLength
                    continue
                }
                bytes = bytes.subarray(skip)
                skip = 0
            }

            let pos = 0
            while (pos < bytes.byteLength) {
                if (upload.file || offset + fill >= totalBytes) {
                    throw new RecordingJobError("Zoom stream is longer than the expected file size")
                }
                const n = Math.min(CHUNK_BYTES - fill, bytes.byteLength - pos, totalBytes - offset - fill)
                buffer.set(bytes.subarray(pos, pos + n), fill)
                fill += n
                pos += n

                if (fill === CHUNK_BYTES || offset + fill === totalBytes) {
                    const isFinal = offset + fill === totalBytes
                    await flush(isFinal)
                    if (!upload.file) {
                        await updateJob(supabase, job.id, { bytes_uploaded: offset })
                        if (Date.now() >= deadlineMs) {
                            return { kind: "continued", bytesUploaded: offset }
                        }
                    }
                }
            }
        }

        if (upload.file) return { kind: "done", file: upload.file }
        if (skip > 0 || offset + fill !== totalBytes) {
            throw new RecordingJobError("Zoom stream size does not match the expected file size")
        }
        await flush(true)
        if (!upload.file) {
            throw new RecordingJobError("Google Drive did not finalize the upload")
        }
        return { kind: "done", file: upload.file }
    } finally {
        try {
            await reader.cancel()
        } catch {
            // stream already closed
        }
    }
}

export type ZoomRecordingProcessOutcome = "uploaded" | "continued" | "failed" | "not_leased"

async function runLeasedJob(input: {
    supabase: SupabaseClient
    job: ZoomRecordingJobRow
    headers: Headers
    deadlineMs: number
    downloadHint: ZoomDownloadHint | null
}): Promise<"uploaded" | "continued"> {
    const { supabase, job, headers, deadlineMs, downloadHint } = input
    const totalBytes = Number(job.file_size)
    if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0) {
        throw new RecordingJobError("Invalid recording file size")
    }

    const target = await resolveDriveTarget(supabase, job, headers)

    const existing = await withTransientRetry(() =>
        findDriveFileByAppProperty({
            sharedDriveId: target.sharedDriveId,
            key: DRIVE_APP_PROPERTY_KEY,
            value: job.zoom_recording_file_id,
            headers,
        })
    )
    if (existing) {
        const meta = await verifyDriveFile(existing.id, target.sharedDriveId, totalBytes, headers)
        await markJobUploaded(supabase, job, meta, totalBytes)
        console.log("[GOOGLE DRIVE UPLOAD] existing file reused", {
            jobId: job.id,
            sessionId: job.session_id,
            recordingFileId: job.zoom_recording_file_id,
            driveFileId: meta.id,
        })
        return "uploaded"
    }

    let sessionUri = job.drive_upload_session_uri
    let offset = 0
    if (sessionUri) {
        const currentUri = sessionUri
        try {
            const state = await withTransientRetry(() =>
                queryResumableUploadStatus({ sessionUri: currentUri, totalBytes, headers })
            )
            if (state.done) {
                const meta = await verifyDriveFile(state.file.id, target.sharedDriveId, totalBytes, headers)
                await markJobUploaded(supabase, job, meta, totalBytes)
                return "uploaded"
            }
            offset = state.nextOffset
        } catch (e) {
            if (!isDriveSessionGone(e)) throw e
            sessionUri = null
            offset = 0
        }
    }

    if (!sessionUri) {
        sessionUri = await withTransientRetry(() =>
            startResumableUpload({
                folderId: target.folderId,
                name: buildDriveFileName(target, job),
                totalBytes,
                appProperties: {
                    [DRIVE_APP_PROPERTY_KEY]: job.zoom_recording_file_id,
                    sessionId: job.session_id ?? "",
                },
                headers,
            })
        )
        await updateJob(supabase, job.id, { drive_upload_session_uri: sessionUri, bytes_uploaded: 0 })
        offset = 0
    }

    const res = await openRecordingStream(job, downloadHint, offset, deadlineMs)
    const outcome = await streamZoomToDrive({
        supabase,
        job,
        res,
        sessionUri,
        startOffset: offset,
        totalBytes,
        headers,
        deadlineMs,
    })

    if (outcome.kind === "continued") {
        await markJobContinuation(supabase, job.id, outcome.bytesUploaded)
        return "continued"
    }

    const meta = await verifyDriveFile(outcome.file.id, target.sharedDriveId, totalBytes, headers)
    await markJobUploaded(supabase, job, meta, totalBytes)
    return "uploaded"
}

/**
 * Lease + process one job within `deadlineMs`. Never throws.
 * Time-budget continuations leave the job `pending` without consuming an attempt.
 */
export async function processZoomRecordingJob(input: {
    supabase: SupabaseClient
    jobId: string
    headers: Headers
    deadlineMs: number
    downloadHint?: ZoomDownloadHint | null
}): Promise<ZoomRecordingProcessOutcome> {
    const { supabase, jobId, headers, deadlineMs } = input

    let job: ZoomRecordingJobRow | null
    try {
        job = await leaseJob(supabase, jobId)
    } catch (e) {
        console.error("[ZOOM RECORDING JOB] lease error", { jobId, error: safeErrorMessage(e) })
        return "not_leased"
    }
    if (!job) return "not_leased"

    const startedAt = Date.now()
    const startBytes = job.bytes_uploaded
    console.log("[ZOOM RECORDING JOB] processing", {
        jobId: job.id,
        sessionId: job.session_id,
        meetingId: job.zoom_meeting_id,
        recordingFileId: job.zoom_recording_file_id,
        bytesUploaded: startBytes,
        fileSize: job.file_size,
    })

    try {
        const outcome = await runLeasedJob({
            supabase,
            job,
            headers,
            deadlineMs,
            downloadHint: input.downloadHint ?? null,
        })
        console.log("[GOOGLE DRIVE UPLOAD]", {
            jobId: job.id,
            sessionId: job.session_id,
            meetingId: job.zoom_meeting_id,
            recordingFileId: job.zoom_recording_file_id,
            status: outcome === "uploaded" ? "uploaded" : "pending",
            durationMs: Date.now() - startedAt,
        })
        return outcome
    } catch (e) {
        await markJobFailed(supabase, job, e)
        return "failed"
    }
}

/** Cron: process due jobs sequentially until the budget is spent. */
export async function processDueZoomRecordingJobs(input: {
    supabase: SupabaseClient
    headers: Headers
    deadlineMs: number
    maxJobs: number
}): Promise<Array<{ jobId: string; outcome: ZoomRecordingProcessOutcome }>> {
    const { supabase, headers, deadlineMs, maxJobs } = input
    const { data, error } = await supabase
        .from(JOBS_TABLE)
        .select("id")
        .or(dueJobsFilter(new Date()))
        .order("created_at", { ascending: true })
        .limit(maxJobs)
    if (error) {
        throw new Error(`job_list_failed:${error.message}`)
    }

    const results: Array<{ jobId: string; outcome: ZoomRecordingProcessOutcome }> = []
    for (const row of (data ?? []) as Array<{ id: string }>) {
        if (Date.now() >= deadlineMs - 15_000) break
        const outcome = await processZoomRecordingJob({ supabase, jobId: row.id, headers, deadlineMs })
        results.push({ jobId: row.id, outcome })
    }
    return results
}
