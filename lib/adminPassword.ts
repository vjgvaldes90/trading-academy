import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { normalizeUserEmail } from "@/lib/adminEmails"

/**
 * Encoded as: scrypt:N:r:p:saltBase64url:hashBase64url
 * Colon separators — `$` breaks Next.js/dotenv variable expansion in .env files.
 */
const HASH_PREFIX = "scrypt"
const KEYLEN = 64
const DEFAULT_N = 16384
const DEFAULT_R = 8
const DEFAULT_P = 1
/** Node scrypt default maxmem is too low for N=16384 on some builds. */
const MAXMEM = 64 * 1024 * 1024

const TONY_EMAIL = "tony@smartoptionacademy.com"
const IT_EMAIL = "it@smartoptionacademy.com"

export type AdminPasswordHashParams = {
    N: number
    r: number
    p: number
    salt: Buffer
    hash: Buffer
}

function scryptDerive(
    password: string,
    salt: Buffer,
    keylen: number,
    options: { N: number; r: number; p: number; maxmem: number }
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, keylen, options, (err, derivedKey) => {
            if (err) {
                reject(err)
                return
            }
            resolve(derivedKey as Buffer)
        })
    })
}

function envHashForEmail(email: string): string | null {
    const normalized = normalizeUserEmail(email)
    if (normalized === TONY_EMAIL) {
        const raw = process.env.ADMIN_PASSWORD_HASH_TONY?.trim()
        return raw || null
    }
    if (normalized === IT_EMAIL) {
        const raw = process.env.ADMIN_PASSWORD_HASH_IT?.trim()
        return raw || null
    }
    return null
}

/**
 * Parse stored scrypt hash. Returns null on any malformed value (fail closed).
 * Accepts colon format (preferred) and legacy `$` format.
 */
export function parseAdminPasswordHash(encoded: string): AdminPasswordHashParams | null {
    const trimmed = encoded.trim()
    const parts = trimmed.includes(":") ? trimmed.split(":") : trimmed.split("$")
    if (parts.length !== 6) return null
    const [prefix, nRaw, rRaw, pRaw, saltB64, hashB64] = parts
    if (prefix !== HASH_PREFIX) return null

    const N = Number(nRaw)
    const r = Number(rRaw)
    const p = Number(pRaw)
    if (!Number.isInteger(N) || N < 2 || (N & (N - 1)) !== 0) return null
    if (!Number.isInteger(r) || r < 1) return null
    if (!Number.isInteger(p) || p < 1) return null
    if (!saltB64 || !hashB64) return null

    let salt: Buffer
    let hash: Buffer
    try {
        salt = Buffer.from(saltB64, "base64url")
        hash = Buffer.from(hashB64, "base64url")
    } catch {
        return null
    }
    if (salt.length < 16 || hash.length < 32) return null

    return { N, r, p, salt, hash }
}

export function encodeAdminPasswordHash(params: AdminPasswordHashParams): string {
    return [
        HASH_PREFIX,
        String(params.N),
        String(params.r),
        String(params.p),
        params.salt.toString("base64url"),
        params.hash.toString("base64url"),
    ].join(":")
}

/**
 * Hash a plaintext password for storage in env (offline / ops use only).
 * Do not log the password or the resulting hash in application request paths.
 * Not exposed via any public API route.
 */
export async function hashAdminPassword(password: string): Promise<string> {
    const salt = randomBytes(16)
    const derived = await scryptDerive(password, salt, KEYLEN, {
        N: DEFAULT_N,
        r: DEFAULT_R,
        p: DEFAULT_P,
        maxmem: MAXMEM,
    })
    return encodeAdminPasswordHash({
        N: DEFAULT_N,
        r: DEFAULT_R,
        p: DEFAULT_P,
        salt,
        hash: derived,
    })
}

async function verifyAgainstEncodedHash(password: string, encoded: string): Promise<boolean> {
    const parsed = parseAdminPasswordHash(encoded)
    if (!parsed) return false

    const derived = await scryptDerive(password, parsed.salt, parsed.hash.length, {
        N: parsed.N,
        r: parsed.r,
        p: parsed.p,
        maxmem: MAXMEM,
    })

    if (derived.length !== parsed.hash.length) return false
    return timingSafeEqual(derived, parsed.hash)
}

/**
 * Verify password for an authorized admin email using env-stored scrypt hashes.
 * Fail closed: missing/malformed hash, empty password, or unknown email → false.
 */
export async function verifyAdminPassword(email: string, password: string): Promise<boolean> {
    if (typeof password !== "string" || password.length === 0) return false

    const encoded = envHashForEmail(email)
    if (!encoded) return false

    try {
        return await verifyAgainstEncodedHash(password, encoded)
    } catch {
        return false
    }
}
