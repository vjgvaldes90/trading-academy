/**
 * Single source of truth for absolute application URLs
 * (welcome/access emails, Stripe redirects, auth callbacks).
 *
 * Canonical env (required in production):
 *   NEXT_PUBLIC_APP_URL=https://your-production-domain.com
 *
 * Optional server-only override (recommended on Vercel for webhooks/emails):
 *   APP_URL=https://your-production-domain.com
 *
 * Why APP_URL exists:
 *   NEXT_PUBLIC_* values are inlined at build time. If a production build was
 *   created while a local .env had NEXT_PUBLIC_APP_URL=http://localhost:3000,
 *   that localhost value can be baked into the server bundle. APP_URL is read
 *   at runtime and is not inlined, so it can correct that misconfiguration.
 *
 * Localhost is returned ONLY when not running in production.
 */

function isProductionRuntime(): boolean {
    return (
        process.env.VERCEL_ENV === "production" ||
        process.env.NODE_ENV === "production"
    )
}

function isLocalhostOrigin(origin: string): boolean {
    try {
        const { hostname } = new URL(origin)
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    } catch {
        return /localhost|127\.0\.0\.1/i.test(origin)
    }
}

function normalizeOrigin(raw: string): string {
    let value = raw.trim().replace(/\/$/, "")
    if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`
    }
    return value
}

function readConfiguredAppUrl(): string | null {
    // Canonical first; APP_URL as runtime override when NEXT_PUBLIC was baked wrong.
    const candidates = [process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL]
    for (const raw of candidates) {
        const trimmed = typeof raw === "string" ? raw.trim() : ""
        if (!trimmed) continue
        const origin = normalizeOrigin(trimmed)
        if (isProductionRuntime() && isLocalhostOrigin(origin)) {
            console.error(
                "[app-url] Ignoring localhost value from env in production:",
                origin
            )
            continue
        }
        return origin
    }
    return null
}

/**
 * Canonical app origin with no trailing slash.
 */
export function getAppUrl(): string {
    const configured = readConfiguredAppUrl()
    if (configured) return configured

    if (!isProductionRuntime()) {
        return "http://localhost:3000"
    }

    const vercel = process.env.VERCEL_URL?.trim()
    if (vercel) {
        const origin = normalizeOrigin(vercel.startsWith("http") ? vercel : `https://${vercel}`)
        console.warn(
            "[app-url] NEXT_PUBLIC_APP_URL missing; using VERCEL_URL as production fallback:",
            origin
        )
        return origin
    }

    throw new Error(
        "Missing NEXT_PUBLIC_APP_URL. Set it in Vercel Production to your public origin (no trailing slash)."
    )
}

/** Absolute URL for a path on this app (path should start with `/`). */
export function getAppAbsoluteUrl(path: string): string {
    const base = getAppUrl()
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    return `${base}${normalizedPath}`
}

/** Student login page used in access / welcome emails. */
export function getAppLoginUrl(): string {
    return getAppAbsoluteUrl("/login")
}

/** Supabase magic-link redirect target (must be allowlisted in Supabase). */
export function getAuthCallbackUrl(): string {
    return getAppAbsoluteUrl("/auth/callback")
}
