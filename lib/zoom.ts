/**
 * Zoom REST API via Server-to-Server OAuth (account credentials).
 *
 * API auth: Server-to-Server OAuth only (never ZOOM_API_KEY / JWT app creds).
 *
 * Env (read at runtime via {@link getZoomEnv}, never at module load):
 * - ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET — required for REST + OAuth token
 * - ZOOM_WEBHOOK_SECRET — verify Zoom webhook payloads when a webhook route is added
 * - ZOOM_SESSION_TIMEZONE — IANA zone for scheduled meetings (default: UTC)
 * - ZOOM_HOST_EMAIL — host user email; if unset, paths use users/me (may fail for some tenants)
 */

import { ADMIN_EMAILS } from "@/lib/adminEmails"

const ZOOM_API = "https://api.zoom.us/v2"
const ZOOM_OAUTH = "https://zoom.us/oauth/token"

export class ZoomConfigError extends Error {
    readonly code = "ZOOM_CONFIG"
    constructor(message: string) {
        super(message)
        this.name = "ZoomConfigError"
    }
}

export class ZoomApiError extends Error {
    readonly code = "ZOOM_API"
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = "ZoomApiError"
        this.status = status
    }
}

export type ZoomMeetingDetails = {
    join_url: string
    start_url: string
    meeting_id: string
    password: string
}

type ZoomTokenJson = {
    access_token?: string
    expires_in?: number
}

type ZoomMeetingCreateResponse = {
    id?: number | string
    join_url?: string
    start_url?: string
    password?: string
    h323_password?: string
}

/** Read Zoom-related env at call time (not at module load). */
export function getZoomEnv() {
    return {
        accountId: process.env.ZOOM_ACCOUNT_ID,
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
        webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
    }
}

function logZoomEnvCheck(accountId: unknown, clientId: unknown, clientSecret: unknown, webhookSecret: unknown): void {
    console.log("[ZOOM ENV CHECK]", {
        accountId: !!accountId,
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        webhookSecret: !!webhookSecret,
    })
}

function throwIfZoomOAuthIncomplete(accountId: unknown, clientId: unknown, clientSecret: unknown): void {
    const missing: string[] = []
    if (typeof accountId !== "string" || !accountId.trim()) missing.push("ZOOM_ACCOUNT_ID")
    if (typeof clientId !== "string" || !clientId.trim()) missing.push("ZOOM_CLIENT_ID")
    if (typeof clientSecret !== "string" || !clientSecret.trim()) missing.push("ZOOM_CLIENT_SECRET")
    if (missing.length > 0) {
        throw new ZoomConfigError(
            `Zoom Server-to-Server OAuth is not configured. Missing environment variables: ${missing.join(", ")}`
        )
    }
}

/** Token reuse until shortly before expiry (access token only; env is re-read when refreshing). */
let tokenCache: { accessToken: string; expiresAtMs: number } | null = null
const TOKEN_SKEW_MS = 60_000

export async function getZoomAccessToken(): Promise<string> {
    const { accountId, clientId, clientSecret, webhookSecret } = getZoomEnv()
    logZoomEnvCheck(accountId, clientId, clientSecret, webhookSecret)
    throwIfZoomOAuthIncomplete(accountId, clientId, clientSecret)

    const accountIdT = (accountId as string).trim()
    const clientIdT = (clientId as string).trim()
    const clientSecretT = (clientSecret as string).trim()

    const now = Date.now()
    if (tokenCache && tokenCache.expiresAtMs > now + TOKEN_SKEW_MS) {
        return tokenCache.accessToken
    }

    const basic = Buffer.from(`${clientIdT}:${clientSecretT}`).toString("base64")
    const tokenUrl =
        `${ZOOM_OAUTH}?grant_type=account_credentials&account_id=${encodeURIComponent(accountIdT)}`

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    })

    const rawText = await res.text()
    if (!res.ok) {
        console.error("[ZOOM ERROR]", "oauth_token", res.status, rawText)
        throw new ZoomApiError(`Zoom OAuth token request failed (${res.status})`, res.status)
    }

    let data: ZoomTokenJson
    try {
        data = JSON.parse(rawText) as ZoomTokenJson
    } catch {
        console.error("[ZOOM ERROR]", "oauth_token_parse", rawText.slice(0, 200))
        throw new ZoomApiError("Zoom OAuth returned invalid JSON", res.status)
    }

    const access_token = typeof data.access_token === "string" ? data.access_token : ""
    if (!access_token) {
        console.error("[ZOOM ERROR]", "oauth_token_missing_access_token", rawText.slice(0, 300))
        throw new ZoomApiError("Zoom OAuth response missing access_token", res.status)
    }

    const expiresInSec = typeof data.expires_in === "number" && Number.isFinite(data.expires_in) ? data.expires_in : 3600
    tokenCache = {
        accessToken: access_token,
        expiresAtMs: now + expiresInSec * 1000,
    }

    return access_token
}

function zoomScheduledMeetingsUrl(): string {
    const email = process.env.ZOOM_HOST_EMAIL?.trim()
    if (email) {
        return `${ZOOM_API}/users/${encodeURIComponent(email)}/meetings`
    }
    return `${ZOOM_API}/users/me/meetings`
}

function zoomAlternativeHostsCsv(): string {
    const hosts = ADMIN_EMAILS.filter((email) => email && email.includes("@"))
    return hosts.join(",")
}

export function getZoomSessionTimezone(): string {
    return process.env.ZOOM_SESSION_TIMEZONE?.trim() || "UTC"
}

export function normalizeTimeForZoomStart(timeRaw: string): string {
    const t = timeRaw.trim()
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t)
    if (!m) {
        throw new Error(`Invalid session time for Zoom: ${timeRaw}`)
    }
    const h = Number(m[1])
    const min = m[2]
    const sec = m[3] ?? "00"
    if (!Number.isFinite(h) || h < 0 || h > 23) {
        throw new Error(`Invalid session hour for Zoom: ${timeRaw}`)
    }
    return `${String(h).padStart(2, "0")}:${min}:${sec.padStart(2, "0")}`
}

/** `YYYY-MM-DD` + wall-clock time → Zoom `start_time` (local to {@link getZoomSessionTimezone}). */
export function buildZoomStartTime(dateYmd: string, timeRaw: string): string {
    const date = dateYmd.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid date for Zoom: ${dateYmd}`)
    }
    const clock = normalizeTimeForZoomStart(timeRaw)
    return `${date}T${clock}`
}

function mapMeetingResponse(data: ZoomMeetingCreateResponse): ZoomMeetingDetails {
    const id = data.id
    const meeting_id =
        typeof id === "number" && Number.isFinite(id)
            ? String(id)
            : typeof id === "string" && id.trim() !== ""
              ? id.trim()
              : ""
    const join_url = typeof data.join_url === "string" ? data.join_url.trim() : ""
    const start_url = typeof data.start_url === "string" ? data.start_url.trim() : ""
    const password =
        typeof data.password === "string" && data.password.trim() !== ""
            ? data.password.trim()
            : typeof data.h323_password === "string"
              ? data.h323_password.trim()
              : ""

    if (!meeting_id || !join_url || !start_url) {
        console.error("[ZOOM ERROR]", "create_response_incomplete", JSON.stringify(data).slice(0, 500))
        throw new ZoomApiError("Zoom create meeting response missing id, join_url, or start_url", 502)
    }

    return {
        meeting_id,
        join_url,
        start_url,
        password,
    }
}

async function zoomFetchJson(method: string, url: string, body?: unknown): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
    const token = await getZoomAccessToken()
    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let json: unknown
    try {
        json = text ? JSON.parse(text) : null
    } catch {
        json = null
    }
    return { ok: res.ok, status: res.status, json, text }
}

export async function createZoomMeeting(input: {
    topic: string
    start_time: string
    duration: number
}): Promise<ZoomMeetingDetails> {
    const { accountId, clientId, clientSecret, webhookSecret } = getZoomEnv()
    logZoomEnvCheck(accountId, clientId, clientSecret, webhookSecret)
    throwIfZoomOAuthIncomplete(accountId, clientId, clientSecret)

    const timezone = getZoomSessionTimezone()
    const duration =
        typeof input.duration === "number" && Number.isFinite(input.duration) && input.duration > 0
            ? Math.min(Math.floor(input.duration), 1440)
            : 60

    const url = zoomScheduledMeetingsUrl()
    const alternativeHosts = zoomAlternativeHostsCsv()
    const { ok, status, json, text } = await zoomFetchJson("POST", url, {
        topic: input.topic,
        type: 2,
        start_time: input.start_time,
        duration,
        timezone,
        settings: {
            waiting_room: true,
            join_before_host: false,
            ...(alternativeHosts ? { alternative_hosts: alternativeHosts } : {}),
        },
    })

    if (!ok || !json || typeof json !== "object") {
        console.error("[ZOOM ERROR]", "create_meeting", status, text.slice(0, 1200))
        throw new ZoomApiError(
            typeof (json as { message?: unknown })?.message === "string"
                ? (json as { message: string }).message
                : `Zoom create meeting failed (${status})`,
            status
        )
    }

    const details = mapMeetingResponse(json as ZoomMeetingCreateResponse)
    console.log("[ZOOM CREATED]", details.meeting_id)
    return details
}

export type ZoomMeetingUpdateInput = {
    /** Zoom `start_time` local string `yyyy-MM-ddTHH:mm:ss` */
    start_time?: string
    duration?: number
    topic?: string
}

/**
 * Patch an existing scheduled meeting. Pass fields that changed.
 * `meetingId` is Zoom’s numeric meeting id as string.
 */
export async function updateZoomMeeting(meetingId: string, patch: ZoomMeetingUpdateInput): Promise<ZoomMeetingDetails> {
    const { accountId, clientId, clientSecret, webhookSecret } = getZoomEnv()
    logZoomEnvCheck(accountId, clientId, clientSecret, webhookSecret)
    throwIfZoomOAuthIncomplete(accountId, clientId, clientSecret)

    const id = meetingId.trim()
    if (!id) {
        throw new ZoomConfigError("updateZoomMeeting: empty meetingId")
    }

    const timezone = getZoomSessionTimezone()
    const body: Record<string, unknown> = {}
    const alternativeHosts = zoomAlternativeHostsCsv()

    if (typeof patch.topic === "string" && patch.topic.trim() !== "") {
        body.topic = patch.topic.trim()
    }
    if (typeof patch.duration === "number" && Number.isFinite(patch.duration) && patch.duration > 0) {
        body.duration = Math.min(Math.floor(patch.duration), 1440)
    }
    if (typeof patch.start_time === "string" && patch.start_time.trim() !== "") {
        body.start_time = patch.start_time.trim()
        body.timezone = timezone
    }
    if (alternativeHosts) {
        body.settings = { alternative_hosts: alternativeHosts }
    }

    if (Object.keys(body).length === 0) {
        console.error("[ZOOM ERROR]", "update_meeting_empty_patch", id)
        throw new ZoomConfigError("updateZoomMeeting: nothing to update")
    }

    const url = `${ZOOM_API}/meetings/${encodeURIComponent(id)}`
    const { ok, status, json, text } = await zoomFetchJson("PATCH", url, body)

    if (!ok) {
        console.error("[ZOOM ERROR]", "update_meeting", status, text.slice(0, 1200))
        throw new ZoomApiError(
            typeof (json as { message?: unknown })?.message === "string"
                ? (json as { message: string }).message
                : `Zoom update meeting failed (${status})`,
            status
        )
    }

    let data: ZoomMeetingCreateResponse | null =
        json && typeof json === "object" ? (json as ZoomMeetingCreateResponse) : null

    if (
        !data ||
        typeof data.join_url !== "string" ||
        typeof data.start_url !== "string" ||
        data.id === undefined
    ) {
        const fetched = await zoomFetchJson("GET", `${ZOOM_API}/meetings/${encodeURIComponent(id)}`)
        if (fetched.ok && fetched.json && typeof fetched.json === "object") {
            data = fetched.json as ZoomMeetingCreateResponse
        }
    }

    if (!data) {
        console.error("[ZOOM ERROR]", "update_meeting_no_body", status)
        throw new ZoomApiError("Zoom update meeting returned no meeting payload", status || 502)
    }

    const details = mapMeetingResponse(data)
    console.log("[ZOOM UPDATED]", details.meeting_id)
    return details
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
    const { accountId, clientId, clientSecret, webhookSecret } = getZoomEnv()
    logZoomEnvCheck(accountId, clientId, clientSecret, webhookSecret)
    throwIfZoomOAuthIncomplete(accountId, clientId, clientSecret)

    const id = meetingId.trim()
    if (!id) {
        throw new ZoomConfigError("deleteZoomMeeting: empty meetingId")
    }

    const token = await getZoomAccessToken()
    const url = `${ZOOM_API}/meetings/${encodeURIComponent(id)}`
    const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) {
        console.log("[ZOOM DELETED]", id, "(already removed)")
        return
    }

    if (!res.ok) {
        const text = await res.text()
        console.error("[ZOOM ERROR]", "delete_meeting", res.status, text.slice(0, 800))
        throw new ZoomApiError(`Zoom delete meeting failed (${res.status})`, res.status)
    }

    console.log("[ZOOM DELETED]", id)
}
