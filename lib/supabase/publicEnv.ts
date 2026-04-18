/**
 * URL + anon pública de Supabase.
 *
 * - Cliente (navegador): solo existen `NEXT_PUBLIC_*` (Next las inyecta en el bundle del cliente).
 *   `SUPABASE_URL` sin prefijo no está disponible en el browser.
 * - Servidor: puede usar `NEXT_PUBLIC_*` o, como respaldo solo en Node, `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
 */

export type SupabasePublicEnv = {
    url: string
    anonKey: string
}

const isDev = process.env.NODE_ENV === "development"

function envDebug(scope: "browser" | "server", payload: Record<string, boolean | string>) {
    if (!isDev) return
    console.log(`[Supabase env] ${scope}`, payload)
}

/** Para `lib/supabase` importado desde componentes `"use client"`. */
export function requireBrowserSupabaseEnv(): SupabasePublicEnv {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

    envDebug("browser", {
        hasNEXT_PUBLIC_SUPABASE_URL: Boolean(url),
        hasNEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anonKey),
    })

    if (!url || !anonKey) {
        throw new Error(
            [
                "Supabase (cliente): NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidas o están vacías.",
                "Solución: en la raíz de la app Next (trading-academy/.env.local) añade las mismas credenciales que en Supabase → Settings → API:",
                "  NEXT_PUBLIC_SUPABASE_URL=<Project URL>",
                "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public>",
                "Guarda el archivo y reinicia el servidor de desarrollo (npm run dev).",
            ].join("\n")
        )
    }

    return { url, anonKey }
}

/** Para helpers de servidor que consumen URL + anon key públicas. */
export function requireServerSupabasePublicEnv(): SupabasePublicEnv {
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
        process.env.SUPABASE_URL?.trim() ||
        ""
    const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.SUPABASE_ANON_KEY?.trim() ||
        ""

    envDebug("server", {
        hasNEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        hasNEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        hasSUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
        resolvedUrl: Boolean(url),
        resolvedAnonKey: Boolean(anonKey),
    })

    if (!url || !anonKey) {
        throw new Error(
            [
                "Supabase (servidor): faltan URL y/o clave anon para clientes de servidor.",
                "En trading-academy/.env.local define:",
                "  NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (recomendado),",
                "o SUPABASE_URL + SUPABASE_ANON_KEY (solo servidor, no llegan al navegador).",
                "Reinicia npm run dev tras guardar.",
            ].join("\n")
        )
    }

    return { url, anonKey }
}
