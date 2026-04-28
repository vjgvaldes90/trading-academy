"use client"

type AccessFormProps = {
    code: string
    setCode: (value: string) => void
    handleAccess: () => void | Promise<void>
    error?: string | null
    onClearError?: () => void
}

export default function AccessForm({
    code,
    setCode,
    handleAccess,
    error,
    onClearError,
}: AccessFormProps) {
    return (
        <form
            className="space-y-2"
            onSubmit={(e) => {
                e.preventDefault()
                void handleAccess()
            }}
        >
            <label htmlFor="access-code" className="sr-only">
                Código de acceso
            </label>
            <input
                id="access-code"
                type="text"
                name="access_code"
                autoComplete="one-time-code"
                placeholder="Código de acceso"
                value={code}
                onChange={(e) => {
                    onClearError?.()
                    setCode(e.target.value.toUpperCase())
                }}
                className="w-full rounded-lg border border-blue-400/30 bg-[#040B18] px-4 py-3 uppercase tracking-widest text-slate-100 placeholder:normal-case placeholder:tracking-normal placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "access-code-error" : undefined}
            />
            {error ? (
                <p id="access-code-error" className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            ) : null}

            <button
                type="submit"
                className="mt-4 w-full rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 py-3 font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.32)] transition hover:brightness-110"
            >
                Entrar al dashboard
            </button>
        </form>
    )
}