/**
 * Google Drive REST API via Vercel OIDC → Google Workload Identity Federation (no JSON key).
 *
 * Server-only: import exclusively from `runtime = "nodejs"` route handlers.
 *
 * Flow: Vercel OIDC token → Google STS (federated token) → IAM Credentials
 * `generateAccessToken` (impersonate service account) → Drive API.
 *
 * Env (read at call time via {@link getGoogleWifEnv}, never at module load):
 * - GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
 * - GCP_SERVICE_ACCOUNT_EMAIL
 * - GCP_PROJECT_ID (informational; not required by the token exchange)
 *
 * OIDC token source (per Vercel docs): the `x-vercel-oidc-token` request header inside
 * Vercel Functions; `VERCEL_OIDC_TOKEN` env only in builds / local `vercel env pull`.
 * The token's `aud` is `https://vercel.com/[TEAM_SLUG]`, so the WIF provider must list it
 * under "Allowed audiences".
 *
 * Tokens are kept in memory only and are never logged or returned to clients.
 */

const STS_TOKEN_URL = "https://sts.googleapis.com/v1/token"
const IAM_CREDENTIALS_API = "https://iamcredentials.googleapis.com/v1"
const DRIVE_API = "https://www.googleapis.com/drive/v3"

export const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly"

const VERCEL_OIDC_HEADER = "x-vercel-oidc-token"
const FETCH_TIMEOUT_MS = 15_000
const TOKEN_SKEW_MS = 5 * 60_000
const SA_TOKEN_LIFETIME = "3600s"

export type GoogleAuthStage = "oidc" | "sts" | "iam" | "drive"

export class GoogleDriveConfigError extends Error {
    readonly code = "GOOGLE_DRIVE_CONFIG"
    constructor(message: string) {
        super(message)
        this.name = "GoogleDriveConfigError"
    }
}

export class GoogleDriveApiError extends Error {
    readonly code = "GOOGLE_DRIVE_API"
    readonly stage: GoogleAuthStage
    readonly status: number
    /** Google error code (e.g. `invalid_grant`, `PERMISSION_DENIED`, `notFound`); never a token. */
    readonly googleCode: string | null

    constructor(message: string, stage: GoogleAuthStage, status: number, googleCode: string | null) {
        super(message)
        this.name = "GoogleDriveApiError"
        this.stage = stage
        this.status = status
        this.googleCode = googleCode
    }
}

/** Read WIF env at call time (not at module load). */
export function getGoogleWifEnv() {
    return {
        projectId: process.env.GCP_PROJECT_ID?.trim() || "",
        projectNumber: process.env.GCP_PROJECT_NUMBER?.trim() || "",
        serviceAccountEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim() || "",
        poolId: process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim() || "",
        providerId: process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim() || "",
    }
}

type RequiredWifEnv = {
    projectNumber: string
    serviceAccountEmail: string
    poolId: string
    providerId: string
}

function requireWifEnv(): RequiredWifEnv {
    const env = getGoogleWifEnv()
    const missing: string[] = []
    if (!env.projectNumber) missing.push("GCP_PROJECT_NUMBER")
    if (!env.serviceAccountEmail) missing.push("GCP_SERVICE_ACCOUNT_EMAIL")
    if (!env.poolId) missing.push("GCP_WORKLOAD_IDENTITY_POOL_ID")
    if (!env.providerId) missing.push("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID")
    if (missing.length > 0) {
        throw new GoogleDriveConfigError(
            `Google Workload Identity Federation is not configured. Missing environment variables: ${missing.join(", ")}`
        )
    }
    return {
        projectNumber: env.projectNumber,
        serviceAccountEmail: env.serviceAccountEmail,
        poolId: env.poolId,
        providerId: env.providerId,
    }
}

/** Is the WIF env present? (Booleans only — safe to expose to admins.) */
export function isGoogleWifConfigured(): boolean {
    try {
        requireWifEnv()
        return true
    } catch {
        return false
    }
}

function wifProviderAudience(env: RequiredWifEnv): string {
    return (
        `//iam.googleapis.com/projects/${env.projectNumber}/locations/global/` +
        `workloadIdentityPools/${env.poolId}/providers/${env.providerId}`
    )
}

/** Non-secret WIF identifiers for temporary admin diagnostics (no tokens, no service account). */
export function getGoogleWifDiagnostics() {
    const env = getGoogleWifEnv()
    const audience = wifProviderAudience(env)
    return {
        audience,
        audienceLength: audience.length,
        projectNumber: env.projectNumber,
        projectNumberLength: env.projectNumber.length,
        poolId: env.poolId,
        poolIdLength: env.poolId.length,
        providerId: env.providerId,
        providerIdLength: env.providerId.length,
    }
}

/** Vercel OIDC token: request header in Vercel Functions, env fallback for builds / local dev. */
export function getVercelOidcTokenFromHeaders(requestHeaders: Headers): string {
    const fromHeader = requestHeaders.get(VERCEL_OIDC_HEADER)?.trim()
    if (fromHeader) return fromHeader
    const fromEnv = process.env.VERCEL_OIDC_TOKEN?.trim()
    if (fromEnv) return fromEnv
    throw new GoogleDriveConfigError(
        "Vercel OIDC token is unavailable. Enable OIDC Federation for the Vercel project and call from a Vercel Function."
    )
}

type JsonResult = { ok: boolean; status: number; json: unknown }

async function fetchJson(url: string, init: RequestInit): Promise<JsonResult> {
    const res = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const text = await res.text()
    let json: unknown = null
    try {
        json = text ? JSON.parse(text) : null
    } catch {
        json = null
    }
    return { ok: res.ok, status: res.status, json }
}

function readString(obj: unknown, key: string): string {
    if (!obj || typeof obj !== "object") return ""
    const v = (obj as Record<string, unknown>)[key]
    return typeof v === "string" ? v : ""
}

/** Extract a non-sensitive Google error code/message (STS OAuth shape or Google API shape). */
function googleErrorInfo(json: unknown): { code: string | null; message: string } {
    if (!json || typeof json !== "object") return { code: null, message: "" }
    const rec = json as Record<string, unknown>
    if (typeof rec.error === "string") {
        return { code: rec.error, message: readString(rec, "error_description") }
    }
    if (rec.error && typeof rec.error === "object") {
        const err = rec.error as Record<string, unknown>
        const status = typeof err.status === "string" ? err.status : null
        const errors = Array.isArray(err.errors) ? err.errors : []
        const reason = errors.length > 0 ? readString(errors[0], "reason") : ""
        return { code: reason || status, message: readString(err, "message") }
    }
    return { code: null, message: "" }
}

function failGoogle(stage: GoogleAuthStage, status: number, json: unknown, fallback: string): never {
    const info = googleErrorInfo(json)
    console.error("[GOOGLE DRIVE ERROR]", stage, status, info.code ?? "unknown", info.message.slice(0, 300))
    throw new GoogleDriveApiError(fallback, stage, status, info.code)
}

async function exchangeOidcForFederatedToken(env: RequiredWifEnv, oidcToken: string): Promise<string> {
    const body = new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        audience: wifProviderAudience(env),
        scope: "https://www.googleapis.com/auth/cloud-platform",
        requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        subject_token: oidcToken,
    })
    const { ok, status, json } = await fetchJson(STS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    })
    const accessToken = ok ? readString(json, "access_token") : ""
    if (!accessToken) {
        failGoogle("sts", status, json, `Google STS token exchange failed (${status})`)
    }
    return accessToken
}

async function impersonateServiceAccount(
    env: RequiredWifEnv,
    federatedToken: string,
    scope: string
): Promise<{ accessToken: string; expiresAtMs: number }> {
    const url =
        `${IAM_CREDENTIALS_API}/projects/-/serviceAccounts/` +
        `${encodeURIComponent(env.serviceAccountEmail)}:generateAccessToken`
    const { ok, status, json } = await fetchJson(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${federatedToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope: [scope], lifetime: SA_TOKEN_LIFETIME }),
    })
    const accessToken = ok ? readString(json, "accessToken") : ""
    if (!accessToken) {
        failGoogle("iam", status, json, `Service account impersonation failed (${status})`)
    }
    const expireMs = Date.parse(readString(json, "expireTime"))
    return {
        accessToken,
        expiresAtMs: Number.isFinite(expireMs) ? expireMs : Date.now() + 3600_000,
    }
}

/** In-memory only, keyed by scope; reused until shortly before expiry. */
const tokenCache = new Map<string, { accessToken: string; expiresAtMs: number }>()
const inflight = new Map<string, Promise<string>>()

/**
 * Short-lived service-account access token for Drive.
 * Pass the incoming request headers so the Vercel OIDC token can be read when a refresh is needed.
 */
export async function getGoogleDriveAccessToken(
    requestHeaders: Headers,
    scope: string = GOOGLE_DRIVE_READONLY_SCOPE
): Promise<string> {
    const cached = tokenCache.get(scope)
    if (cached && cached.expiresAtMs > Date.now() + TOKEN_SKEW_MS) {
        return cached.accessToken
    }

    const pending = inflight.get(scope)
    if (pending) return pending

    const env = requireWifEnv()
    const oidcToken = getVercelOidcTokenFromHeaders(requestHeaders)

    const run = (async () => {
        const federated = await exchangeOidcForFederatedToken(env, oidcToken)
        const sa = await impersonateServiceAccount(env, federated, scope)
        tokenCache.set(scope, sa)
        return sa.accessToken
    })()

    inflight.set(scope, run)
    try {
        return await run
    } finally {
        inflight.delete(scope)
    }
}

const SHARED_DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,128}$/

export type SharedDriveFile = {
    id: string
    name: string
    mimeType: string
}

export type SharedDriveListing = {
    drive: { id: string; name: string }
    files: SharedDriveFile[]
    /** More results exist beyond this first page. */
    hasMore: boolean
}

function toSharedDriveFiles(json: unknown): SharedDriveFile[] {
    if (!json || typeof json !== "object") return []
    const files = (json as Record<string, unknown>).files
    if (!Array.isArray(files)) return []
    return files
        .map((f) => ({
            id: readString(f, "id"),
            name: readString(f, "name"),
            mimeType: readString(f, "mimeType"),
        }))
        .filter((f) => f.id !== "")
}

/**
 * Read-only: Shared Drive metadata + first page of non-trashed items.
 * `sharedDriveId` must be supplied explicitly by the caller.
 */
export async function listSharedDriveFiles(
    sharedDriveId: string,
    requestHeaders: Headers
): Promise<SharedDriveListing> {
    const driveId = sharedDriveId.trim()
    if (!SHARED_DRIVE_ID_RE.test(driveId)) {
        throw new GoogleDriveConfigError("Invalid Shared Drive ID format")
    }

    const token = await getGoogleDriveAccessToken(requestHeaders, GOOGLE_DRIVE_READONLY_SCOPE)
    const auth = { Authorization: `Bearer ${token}` }

    const driveRes = await fetchJson(
        `${DRIVE_API}/drives/${encodeURIComponent(driveId)}?fields=id,name`,
        { method: "GET", headers: auth }
    )
    if (!driveRes.ok) {
        failGoogle("drive", driveRes.status, driveRes.json, `Google Drive drives.get failed (${driveRes.status})`)
    }
    const drive = {
        id: readString(driveRes.json, "id") || driveId,
        name: readString(driveRes.json, "name"),
    }

    const params = new URLSearchParams({
        corpora: "drive",
        driveId,
        includeItemsFromAllDrives: "true",
        supportsAllDrives: "true",
        q: "trashed = false",
        pageSize: "1000",
        fields: "nextPageToken,files(id,name,mimeType)",
    })
    const listRes = await fetchJson(`${DRIVE_API}/files?${params.toString()}`, {
        method: "GET",
        headers: auth,
    })
    if (!listRes.ok) {
        failGoogle("drive", listRes.status, listRes.json, `Google Drive files.list failed (${listRes.status})`)
    }

    return {
        drive,
        files: toSharedDriveFiles(listRes.json),
        hasMore: readString(listRes.json, "nextPageToken") !== "",
    }
}
