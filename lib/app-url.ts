/**
 * Single source of truth for absolute application URLs
 * (welcome/access emails, Stripe redirects, auth callbacks).
 *
 * Required in production (no trailing slash):
 *   NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
 *
 * Optional server-only runtime override (recommended for Stripe webhooks/checkout):
 *   APP_URL=https://your-custom-domain.com
 *
 * IMPORTANT:
 * Never use VERCEL_URL for customer-facing redirects. Preview/protected
 * deployments redirect to https://vercel.com/login?next=...
 */

export type AppUrlSource = "NEXT_PUBLIC_APP_URL" | "APP_URL" | "dev-fallback"

export type AppUrlResolution = {
    url: string
    source: AppUrlSource
}

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

/** Vercel deployment hosts must not be used for Stripe success/cancel or student emails. */
function isVercelDeploymentHost(origin: string): boolean {
    try {
        const { hostname } = new URL(origin)
        return hostname === "vercel.com" || hostname.endsWith(".vercel.app")
    } catch {
        return /\.vercel\.app$/i.test(origin) || /vercel\.com/i.test(origin)
    }
}

function normalizeOrigin(raw: string): string {
    let value = raw.trim().replace(/\/$/, "")
    if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`
    }
    return value
}

function readConfiguredAppUrl(): AppUrlResolution | null {
    const candidates: Array<{ source: AppUrlSource; raw: string | undefined }> = [
        { source: "NEXT_PUBLIC_APP_URL", raw: process.env.NEXT_PUBLIC_APP_URL },
        { source: "APP_URL", raw: process.env.APP_URL },
    ]

    for (const { source, raw } of candidates) {
        const trimmed = typeof raw === "string" ? raw.trim() : ""
        if (!trimmed) continue
        const origin = normalizeOrigin(trimmed)

        if (isProductionRuntime() && isLocalhostOrigin(origin)) {
            console.error(`[app-url] Ignoring localhost ${source} in production:`, origin)
            continue
        }
        if (isProductionRuntime() && isVercelDeploymentHost(origin)) {
            console.error(
                `[app-url] Ignoring Vercel deployment host from ${source} in production (causes vercel.com/login redirects):`,
                origin
            )
            continue
        }
        return { url: origin, source }
    }
    return null
}

/**
 * Resolve app origin + which env provided it (for checkout/email logging).
 */
export function resolveAppUrl(): AppUrlResolution {
    const configured = readConfiguredAppUrl()
    if (configured) return configured

    if (!isProductionRuntime()) {
        return { url: "http://localhost:3000", source: "dev-fallback" }
    }

    throw new Error(
        "Missing NEXT_PUBLIC_APP_URL (or APP_URL). Set it to your public production domain " +
            "(e.g. https://smartoptionacademy.com). Do NOT use *.vercel.app — protected " +
            "deployments redirect Stripe success_url to https://vercel.com/login."
    )
}

/**
 * Canonical app origin with no trailing slash.
 * Does NOT fall back to VERCEL_URL (that causes vercel.com/login redirects).
 */
export function getAppUrl(): string {
    return resolveAppUrl().url
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
