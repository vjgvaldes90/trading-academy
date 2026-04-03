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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg uppercase tracking-widest
          placeholder-gray-500 text-gray-900 placeholder:normal-case placeholder:tracking-normal
          focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full mt-4 bg-[#020617] text-white py-3 rounded-lg font-bold hover:bg-black transition"
            >
                Entrar al dashboard
            </button>
        </form>
    )
}