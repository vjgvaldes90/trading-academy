import { z } from "zod"

/** Server-only VAPID settings. Private key must never be sent to the client. */
export type AdminPushVapidConfig = {
    publicKey: string
    privateKey: string
    subject: string
}

export const pushSubscriptionBodySchema = z.object({
    endpoint: z.string().url().min(1).max(2048),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
        p256dh: z.string().min(1).max(512),
        auth: z.string().min(1).max(512),
    }),
})

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionBodySchema>

export const pushUnsubscribeBodySchema = z.object({
    endpoint: z.string().url().min(1).max(2048),
})

/**
 * Reads VAPID env vars. Does not invent keys.
 * Returns null if any required value is missing.
 */
export function getAdminPushVapidConfig(): AdminPushVapidConfig | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? ""
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? ""
    const subject = process.env.VAPID_SUBJECT?.trim() ?? ""
    if (!publicKey || !privateKey || !subject) return null
    return { publicKey, privateKey, subject }
}

/** Public key only — safe to return to authenticated admins. */
export function getAdminPushVapidPublicKey(): string | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? ""
    return publicKey || null
}

export function isAdminPushVapidConfigured(): boolean {
    return getAdminPushVapidConfig() !== null
}
