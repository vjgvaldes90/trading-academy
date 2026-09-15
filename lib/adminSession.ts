import { isAuthorizedAdminEmail, normalizeUserEmail } from "@/lib/adminEmails"

export const ADMIN_SESSION_COOKIE = "admin_session"

/** 12 hours — independent of student cookie TTL. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

type AdminSessionPayload = {
    email: string
    iat: number
    exp: number
}

/**
 * HMAC-SHA256 via Web Crypto (`crypto.subtle`).
 * Same module works in Edge middleware and Node.js API routes.
 */
function getAdminSessionSecret(): string | null {
    const secret = process.env.ADMIN_SESSION_SECRET?.trim()
    return secret && secret.length >= 32 ? secret : null
}

/** Fail closed when secret is missing or too short. */
export function isAdminSessionSecretConfigured(): boolean {
    return getAdminSessionSecret() !== null
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = ""
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!)
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlDecode(input: string): Uint8Array | null {
    try {
        const padded = input.replace(/-/g, "+").replace(/_/g, "/")
        const padLen = (4 - (padded.length % 4)) % 4
        const withPad = padded + "=".repeat(padLen)
        const binary = atob(withPad)
        const out = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            out[i] = binary.charCodeAt(i)
        }
        return out
    } catch {
        return null
    }
}

function utf8Encode(value: string): Uint8Array<ArrayBuffer> {
    const encoded = new TextEncoder().encode(value)
    const copy = new Uint8Array(encoded.byteLength)
    copy.set(encoded)
    return copy
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        utf8Encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    )
}

async function hmacSign(secret: string, data: string): Promise<string> {
    const key = await importHmacKey(secret)
    const sig = await crypto.subtle.sign("HMAC", key, utf8Encode(data))
    return base64UrlEncode(new Uint8Array(sig))
}

async function hmacVerify(secret: string, data: string, signatureB64Url: string): Promise<boolean> {
    const key = await importHmacKey(secret)
    const sigBytes = base64UrlDecode(signatureB64Url)
    if (!sigBytes || sigBytes.length === 0) return false
    const sigCopy = new Uint8Array(sigBytes.byteLength)
    sigCopy.set(sigBytes)
    return crypto.subtle.verify("HMAC", key, sigCopy, utf8Encode(data))
}

function encodePayload(payload: AdminSessionPayload): string {
    return base64UrlEncode(utf8Encode(JSON.stringify(payload)))
}

function decodePayload(encoded: string): AdminSessionPayload | null {
    const bytes = base64UrlDecode(encoded)
    if (!bytes) return null
    try {
        const json = new TextDecoder().decode(bytes)
        const parsed = JSON.parse(json) as unknown
        if (!parsed || typeof parsed !== "object") return null
        const obj = parsed as Record<string, unknown>
        const email = typeof obj.email === "string" ? normalizeUserEmail(obj.email) : ""
        const iat = typeof obj.iat === "number" ? obj.iat : NaN
        const exp = typeof obj.exp === "number" ? obj.exp : NaN
        if (!email || !Number.isFinite(iat) || !Number.isFinite(exp)) return null
        return { email, iat, exp }
    } catch {
        return null
    }
}

export function adminSessionCookieOptions(maxAgeSeconds: number = ADMIN_SESSION_MAX_AGE_SECONDS) {
    const secure = process.env.NODE_ENV === "production"
    return {
        httpOnly: true as const,
        path: "/" as const,
        sameSite: "lax" as const,
        secure,
        maxAge: maxAgeSeconds,
    }
}

/**
 * Create a signed admin_session cookie value.
 * Returns null if ADMIN_SESSION_SECRET is missing (fail closed).
 */
export async function createAdminSessionToken(email: string): Promise<{
    token: string
    maxAgeSeconds: number
} | null> {
    const secret = getAdminSessionSecret()
    if (!secret) return null

    const normalized = normalizeUserEmail(email)
    if (!normalized || !isAuthorizedAdminEmail(normalized)) return null

    const nowSec = Math.floor(Date.now() / 1000)
    const maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS
    const payload: AdminSessionPayload = {
        email: normalized,
        iat: nowSec,
        exp: nowSec + maxAgeSeconds,
    }
    const body = encodePayload(payload)
    const sig = await hmacSign(secret, body)
    return { token: `${body}.${sig}`, maxAgeSeconds }
}

/**
 * Verify signed admin_session cookie value.
 * Signature is verified before trusting payload fields.
 */
export async function verifyAdminSessionToken(token: string | null | undefined): Promise<string | null> {
    const secret = getAdminSessionSecret()
    if (!secret) return null

    const raw = typeof token === "string" ? token.trim() : ""
    if (!raw) return null

    const dot = raw.indexOf(".")
    if (dot <= 0 || dot === raw.length - 1) return null
    const body = raw.slice(0, dot)
    const sig = raw.slice(dot + 1)
    if (!body || !sig || body.includes(".") || sig.includes(".")) return null

    const ok = await hmacVerify(secret, body, sig)
    if (!ok) return null

    const payload = decodePayload(body)
    if (!payload) return null

    const nowSec = Math.floor(Date.now() / 1000)
    if (payload.exp <= nowSec) return null
    if (payload.iat > nowSec + 60) return null

    if (!isAuthorizedAdminEmail(payload.email)) return null
    return payload.email
}

/** Cookie clear options for logout (maxAge 0). */
export function clearAdminSessionCookieOptions() {
    return { ...adminSessionCookieOptions(0), maxAge: 0 }
}
