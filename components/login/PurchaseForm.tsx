"use client"

type PurchaseFormProps = {
    email: string
    setEmail: (value: string) => void
    handleCheckout: () => void
}

export default function PurchaseForm({ email, setEmail, handleCheckout }: PurchaseFormProps) {
    return (
        <>
            <input
                type="email"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg 
          placeholder-gray-500 text-gray-900 
          focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <button
                type="button"
                onClick={handleCheckout}
                className="w-full bg-green-500 text-black py-3 rounded-lg font-bold hover:bg-green-400 transition"
            >
                🚀 Comprar acceso ($150)
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
                Pago seguro • Acceso inmediato
            </p>
        </>
    )
}