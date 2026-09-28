/**
 * Zoom webhook verification (server-only).
 * Signature: `v0=` + HMAC-SHA256(ZOOM_WEBHOOK_SECRET, `v0:{x-zm-request-timestamp}:{rawBody}`).
 * The secret is never logged or returned.
 */

import { createHmac, timingSafeEqual } from "node:crypto"

const MAX_TIMESTAMP_SKEW_MS = 5 * 60_000

export function getZoomWebhookSecret(): string {
    return process.env.ZOOM_WEBHOOK_SECRET?.trim() || ""
}

function hmacHex(secret: string, message: string): string {
    return createHmac("sha256", secret).update(message, "utf8").digest("hex")
}

export function verifyZoomWebhookSignature(input: {
    rawBody: string
    timestamp: string | null
    signature: string | null
    secret: string
    nowMs?: number
}): boolean {
    const { rawBody, timestamp, signature, secret } = input
    if (!secret || !timestamp || !signature) return false
    if (!/^\d{9,13}$/.test(timestamp)) return false

    const tsNum = Number(timestamp)
    const tsMs = timestamp.length >= 13 ? tsNum : tsNum * 1000
    const now = input.nowMs ?? Date.now()
    if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > MAX_TIMESTAMP_SKEW_MS) return false

    const expected = Buffer.from(`v0=${hmacHex(secret, `v0:${timestamp}:${rawBody}`)}`, "utf8")
    const received = Buffer.from(signature.trim(), "utf8")
    return expected.length === received.length && timingSafeEqual(expected, received)
}

/** Response body for Zoom `endpoint.url_validation`. */
export function buildZoomUrlValidationResponse(plainToken: string, secret: string) {
    return {
        plainToken,
        encryptedToken: hmacHex(secret, plainToken),
    }
}
