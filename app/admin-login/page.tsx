import AdminLoginClient from "@/app/admin-login/AdminLoginClient"

type Props = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function resolveQueryErrorCode(value: string | string[] | undefined): string | null {
    const raw = Array.isArray(value) ? value[0] : value
    const code = typeof raw === "string" ? raw.trim() : ""
    if (!code) return null
    if (code === "unauthorized" || code === "session_expired") return code
    return "access_denied"
}

export default async function AdminLoginPage({ searchParams }: Props) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const queryErrorCode = resolveQueryErrorCode(resolvedSearchParams.error)
    return <AdminLoginClient queryErrorCode={queryErrorCode} />
}
