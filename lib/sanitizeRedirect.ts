/** Solo rutas relativas internas; evita open redirects. */
export function sanitizeRedirect(param: string | null | undefined, fallback = "/dashboard"): string {
    if (!param || param === "") return fallback
    if (!param.startsWith("/")) return fallback
    if (param.startsWith("//")) return fallback
    return param
}
