import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

const TOKEN_TTL_MINUTES = 15

/** Raw token stored uniquely in `magic_tokens`; single-use; 15m TTL. */
export async function createMagicLoginToken(
    supabase: SupabaseClient,
    email: string,
    ttlMinutes: number = TOKEN_TTL_MINUTES
): Promise<{ token: string; expiresAt: string }> {
    const normalizedEmail = email.trim().toLowerCase()
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

    const { error } = await supabase.from("magic_tokens").insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
    })

    if (error) {
        throw new Error(`Failed to create magic token: ${error.message}`)
    }

    console.log(`🔑 Magic token created for: ${normalizedEmail}`)

    return { token, expiresAt }
}

export async function consumeMagicLoginToken(
    supabase: SupabaseClient,
    rawToken: string
): Promise<{ ok: true; email: string } | { ok: false; reason: "invalid" | "expired" }> {
    const { data, error } = await supabase
        .from("magic_tokens")
        .select("id, email, expires_at")
        .eq("token", rawToken.trim())
        .limit(1)
        .maybeSingle()

    if (error || !data) {
        return { ok: false, reason: "invalid" }
    }

    const expiresAt = data.expires_at ? new Date(String(data.expires_at)).getTime() : 0
    const expired = !expiresAt || expiresAt < Date.now()
    if (expired) {
        await supabase.from("magic_tokens").delete().eq("id", data.id)
        return { ok: false, reason: "expired" }
    }

    await supabase.from("magic_tokens").delete().eq("id", data.id)

    return { ok: true, email: String(data.email).trim().toLowerCase() }
}
