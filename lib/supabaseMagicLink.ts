import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getAppUrl, getAuthCallbackUrl } from "@/lib/app-url"

/** @deprecated Prefer `getAppUrl` from `@/lib/app-url`. */
export function getSiteBaseUrl(): string {
    return getAppUrl()
}

/** Where Supabase redirects after the user clicks the magic link (allowlist in Supabase Dashboard). */
export function getAuthMagicCallbackUrl(): string {
    return getAuthCallbackUrl()
}

/**
 * Real Supabase magic-link URL (Admin API). Optional; payment welcome email does not depend on this.
 */
export async function getSupabaseMagicLinkActionUrl(
    email: string
): Promise<{ actionLink: string } | { error: string }> {
    const admin = createSupabaseServiceRoleClient()
    const normalized = email.trim().toLowerCase()
    const redirectTo = getAuthMagicCallbackUrl()
    const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: normalized,
        options: { redirectTo },
    })
    if (error) {
        console.error("[getSupabaseMagicLinkActionUrl]", error)
        return { error: error.message }
    }
    const actionLink = data?.properties?.action_link
    if (!actionLink || typeof actionLink !== "string") {
        return { error: "Missing action_link from Supabase" }
    }
    return { actionLink }
}
