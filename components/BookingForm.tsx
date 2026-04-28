"use client"

import { useState, useEffect, type FormEvent } from "react"
import { supabase } from "@/lib/supabase"

const availableDays = [
    "Lunes",
    "Miércoles",
    "Viernes",
]

const availableHours = [
    "7:00 PM",
    "8:30 PM",
]

export default function BookingForm() {
    const [form, setForm] = useState({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
    })

    const [selectedDay, setSelectedDay] = useState("")
    const [selectedHour, setSelectedHour] = useState("")
    const [spotsLeft, setSpotsLeft] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    // 🔢 cargar cupos por día + hora
    useEffect(() => {
        if (!selectedDay || !selectedHour) return

        const loadSpots = async () => {
            const { count } = await supabase
                .from("tradingbookings")
                .select("*", { count: "exact", head: true })
                .eq("session_day", selectedDay)
                .eq("session_hour", selectedHour)

            if (count !== null) {
                setSpotsLeft(10 - count)
            }
        }

        loadSpots()
    }, [selectedDay, selectedHour])

    const handleBooking = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const { email } = form

        if (!selectedDay || !selectedHour) {
            alert("Selecciona día y hora")
            setLoading(false)
            return
        }

        // 🚫 duplicado
        const { data: existing } = await supabase
            .from("tradingbookings")
            .select("*")
            .eq("email", email)
            .eq("session_day", selectedDay)
            .eq("session_hour", selectedHour)
            .maybeSingle()

        if (existing) {
            alert("Ya tienes una reserva para este horario")
            setLoading(false)
            return
        }

        // 🔢 cupos
        const { count } = await supabase
            .from("tradingbookings")
            .select("*", { count: "exact", head: true })
            .eq("session_day", selectedDay)
            .eq("session_hour", selectedHour)

        if (count && count >= 10) {
            alert("Cupos llenos")
            setLoading(false)
            return
        }

        // 🎟 generar código único
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase()

        // 💾 guardar reserva primero
        const { error } = await supabase
            .from("tradingbookings")
            .insert([
                {
                    email,
                    first_name: form.firstName,
                    last_name: form.lastName,
                    phone: form.phone,
                    session_day: selectedDay,
                    session_hour: selectedHour,
                    access_code: accessCode,
                    paid: false,
                },
            ])

        if (error) {
            alert("Error al guardar")
            setLoading(false)
            return
        }

        // 💰 crear checkout
        const {
            data: { user },
        } = await supabase.auth.getUser()
        const res = await fetch("/api/create-checkout", {
            method: "POST",
            cache: "no-store",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, userId: user?.id ?? null }),
        })

        console.log("STATUS:", res.status)

        const data = await res.json()
        console.log("DATA:", data)

        // 🚀 redirigir
        window.location.href = data.url
    }

        return (
            <form
                onSubmit={handleBooking}
                className="bg-white text-black p-10 rounded-xl space-y-4 w-full max-w-md"
            >
                <h2 className="text-xl font-bold text-center">
                    Reserva tu clase
                </h2>

                <input
                    placeholder="Email"
                    className="w-full p-3 border rounded"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <input
                    placeholder="Nombre"
                    className="w-full p-3 border rounded"
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />

                <input
                    placeholder="Apellido"
                    className="w-full p-3 border rounded"
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />

                <input
                    placeholder="Teléfono"
                    className="w-full p-3 border rounded"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />

                <select
                    className="w-full p-3 border rounded"
                    onChange={(e) => setSelectedDay(e.target.value)}
                >
                    <option value="">Selecciona día</option>
                    {availableDays.map((d) => (
                        <option key={d}>{d}</option>
                    ))}
                </select>

                <select
                    className="w-full p-3 border rounded"
                    onChange={(e) => setSelectedHour(e.target.value)}
                >
                    <option value="">Selecciona hora</option>
                    {availableHours.map((h) => (
                        <option key={h}>{h}</option>
                    ))}
                </select>

                {spotsLeft !== null && (
                    <p className="text-sm text-gray-500">
                        {spotsLeft > 0
                            ? `Quedan ${spotsLeft} cupos`
                            : "Cupos agotados"}
                    </p>
                )}

                <button
                    disabled={loading || spotsLeft === 0}
                    className="w-full bg-green-500 text-white py-3 rounded"
                >
                    {loading ? "Procesando..." : "Reservar y pagar"}
                </button>
            </form>
        )
    }