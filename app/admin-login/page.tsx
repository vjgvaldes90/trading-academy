import AdminLoginClient from "@/app/admin-login/AdminLoginClient"

type Props = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function resolveQueryError(value: string | string[] | undefined): string | null {
    const raw = Array.isArray(value) ? value[0] : value
    const code = typeof raw === "string" ? raw.trim() : ""
    if (!code) return null
    if (code === "unauthorized") return "Only authorized corporate admin accounts can access this area."
    if (code === "session_expired") return "Your admin session expired. Request a new secure login link."
    return "Access denied."
}

export default async function AdminLoginPage({ searchParams }: Props) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const queryError = resolveQueryError(resolvedSearchParams.error)
    return <AdminLoginClient queryError={queryError} />
}
