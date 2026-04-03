"use client"

export default function LoginInfo() {
    return (
        <div className="hidden md:flex flex-col justify-center bg-[#020617] text-white p-12">
            <h2 className="text-4xl font-bold mb-6">
                Estás a un paso de entrar al trading real
            </h2>

            <p className="text-gray-400 mb-8">
                Accede a sesiones en vivo, estrategias reales y mentoría directa.
            </p>

            <ul className="space-y-3 text-gray-300">
                <li>✔ Sesiones en vivo 3 veces por semana</li>
                <li>✔ Trading en tiempo real</li>
                <li>✔ Estrategias paso a paso</li>
                <li>✔ Acceso directo al instructor</li>
            </ul>
        </div>
    )
}