/** Solo rutas relativas internas; evita open redirects. */
export function sanitizeRedirect(param: string | null | undefined, fallback = "/dashboard"): string {
    if (!param || param === "") return fallback
    if (!param.startsWith("/")) return fallback
    if (param.startsWith("//")) return fallback
    return param
}

/** Explicit allowlist for admin post-login destinations (open-redirect safe). */
const ADMIN_POST_LOGIN_ALLOWLIST = new Set(["/admin", "/admin-app"])

/**
 * Returns an allowlisted admin path, or null if the value is not safe / not listed.
 * Rejects absolute URLs, protocol-relative URLs, backslashes, and query/hash variants.
 */
export function resolveAdminPostLoginRedirect(
    param: string | null | undefined
): "/admin" | "/admin-app" | null {
    if (typeof param !== "string") return null
    const raw = param.trim()
    if (!raw) return null
    if (!raw.startsWith("/") || raw.startsWith("//")) return null
    if (raw.includes("\\") || raw.includes("://")) return null
    const pathOnly = raw.split("?")[0]?.split("#")[0] ?? ""
    if (pathOnly === "/admin" || pathOnly === "/admin-app") {
        if (ADMIN_POST_LOGIN_ALLOWLIST.has(pathOnly)) return pathOnly
    }
    return null
}

