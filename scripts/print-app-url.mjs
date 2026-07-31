/**
 * Debug script: print getAppUrl + Stripe redirect URLs from current env.
 * Run: node scripts/print-app-url.mjs
 */
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnvFile(file) {
    const p = resolve(process.cwd(), file)
    if (!existsSync(p)) return
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
        const t = line.trim()
        if (!t || t.startsWith("#")) continue
        const i = t.indexOf("=")
        if (i <= 0) continue
        const key = t.slice(0, i).trim()
        let val = t.slice(i + 1).trim()
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1)
        }
        if (process.env[key] === undefined) process.env[key] = val
    }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function isProductionRuntime() {
    return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
}
function isLocalhostOrigin(origin) {
    try {
        const { hostname } = new URL(origin)
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    } catch {
        return /localhost|127\.0\.0\.1/i.test(origin)
    }
}
function isVercelDeploymentHost(origin) {
    try {
        const { hostname } = new URL(origin)
        return hostname === "vercel.com" || hostname.endsWith(".vercel.app")
    } catch {
        return /\.vercel\.app$/i.test(origin) || /vercel\.com/i.test(origin)
    }
}
function normalizeOrigin(raw) {
    let value = raw.trim().replace(/\/$/, "")
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`
    return value
}
function resolveAppUrl() {
    const candidates = [
        ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
        ["APP_URL", process.env.APP_URL],
    ]
    for (const [name, raw] of candidates) {
        const trimmed = typeof raw === "string" ? raw.trim() : ""
        if (!trimmed) continue
        const origin = normalizeOrigin(trimmed)
        if (isProductionRuntime() && isLocalhostOrigin(origin)) {
            console.log(`skip ${name} (localhost in production):`, origin)
            continue
        }
        if (isProductionRuntime() && isVercelDeploymentHost(origin)) {
            console.log(`skip ${name} (vercel.app host in production):`, origin)
            continue
        }
        return { source: name, url: origin }
    }
    if (!isProductionRuntime()) {
        return { source: "dev-fallback", url: "http://localhost:3000" }
    }
    throw new Error("Missing NEXT_PUBLIC_APP_URL / APP_URL in production")
}

console.log("=== env presence ===")
console.log("NODE_ENV=", process.env.NODE_ENV ?? "(unset)")
console.log("VERCEL_ENV=", process.env.VERCEL_ENV ?? "(unset)")
console.log("NEXT_PUBLIC_APP_URL=", process.env.NEXT_PUBLIC_APP_URL ?? "(unset)")
console.log("APP_URL=", process.env.APP_URL ?? "(unset)")
console.log("VERCEL_URL=", process.env.VERCEL_URL ?? "(unset)")
console.log("(VERCEL_URL is intentionally NOT used for Stripe redirects)")

try {
    const resolved = resolveAppUrl()
    console.log("=== result ===")
    console.log("source=", resolved.source)
    console.log("getAppUrl()=", resolved.url)
    console.log("success_url=", `${resolved.url}/success?session_id={CHECKOUT_SESSION_ID}`)
    console.log("cancel_url=", `${resolved.url}/`)
} catch (e) {
    console.log("=== result ===")
    console.log("ERROR=", e instanceof Error ? e.message : String(e))
}
