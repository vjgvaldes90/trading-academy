function normalizeEmail(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export const ADMIN_EMAILS: string[] = [
    "tony@smartoptionacademy.com",
    "it@smartoptionacademy.com",
].map((email) => normalizeEmail(email))
const ADMIN_EMAIL_SET = new Set(ADMIN_EMAILS)

export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false
    return ADMIN_EMAIL_SET.has(normalizeEmail(email))
}

export function normalizeUserEmail(email: string | null | undefined): string {
    return normalizeEmail(email)
}
