function normalizeEmail(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function parseEmailList(raw: string | undefined): string[] {
    if (!raw) return []
    return raw
        .split(",")
        .map((value) => normalizeEmail(value))
        .filter((value) => value.length > 0)
}

const defaultAdminEmails = [
    "tony@smartoptionacademy.com",
    "it@smartoptionacademy.com",
].map((email) => normalizeEmail(email))

const configuredAdminEmails = parseEmailList(process.env.ADMIN_EMAILS)

export const ADMIN_EMAILS: string[] = Array.from(new Set([...defaultAdminEmails, ...configuredAdminEmails]))
const ADMIN_EMAIL_SET = new Set(ADMIN_EMAILS)

export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false
    return ADMIN_EMAIL_SET.has(normalizeEmail(email))
}

export function normalizeUserEmail(email: string | null | undefined): string {
    return normalizeEmail(email)
}
