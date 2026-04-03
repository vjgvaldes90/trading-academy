"use client"
import { useRouter } from "next/navigation"
import { BarChart3, TrendingUp, Shield, Brain, Monitor, GraduationCap } from "lucide-react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import TradingChart from "@/components/TradingChart"
import { MessageCircle } from "lucide-react"
import Navbar from "@/components/landing/Navbar"
import Hero from "@/components/landing/Hero"
import HowItWorks from "@/components/landing/HowItWorks"
import Pricing from "@/components/landing/Pricing"
import ChartSection from "@/components/landing/ChartSection"
import Testimonials from "@/components/landing/Testimonials"
import Schedule from "@/components/landing/Schedule"
import WhatYouLearn from "@/components/landing/WhatYouLearn"
import Instructor from "@/components/landing/Instructor"

export default function Home() {

  const [timeLeft, setTimeLeft] = useState(0)

  const images = ["/chart1.jpg", "/chart2.jpg", "/chart3.jpg", "/chart4.jpg"]
  const [particles, setParticles] = useState<{ left: number; delay: number }[]>([])
  const [index, setIndex] = useState(0)
  const [isLive, setIsLive] = useState(false)
  const router = useRouter()


  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    const p = Array.from({ length: 25 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 10
    }))

    setParticles(p)
  }, [])
  useEffect(() => {

    const getNextSession = () => {
      const now = new Date()

      const days = [1, 3, 5] // lunes, miércoles, viernes
      const target = new Date(now)

      for (let i = 0; i < 7; i++) {
        target.setDate(now.getDate() + i)

        if (days.includes(target.getDay())) {
          target.setHours(19, 0, 0, 0)

          if (target.getTime() > now.getTime()) {
            return target
          }
        }
      }
    }

    let nextSession = getNextSession()

    const interval = setInterval(() => {
      const now = new Date().getTime()

      if (!nextSession) return

      const distance = nextSession.getTime() - now

      if (distance <= 0) {
        nextSession = getNextSession()
      }

      setTimeLeft(distance)
    }, 1000)

    return () => clearInterval(interval)

  }, [])
  useEffect(() => {

    const checkLiveSession = () => {
      const now = new Date()

      const day = now.getDay() // 0 domingo, 1 lunes...
      const hour = now.getHours()
      const minutes = now.getMinutes()

      const isSessionDay = [1, 3, 5].includes(day) // lunes, miércoles, viernes

      // sesión activa entre 7:00 PM y 8:30 PM
      const isSessionTime =
        (hour === 19 && minutes >= 0) ||
        (hour === 20 && minutes <= 30)

      setIsLive(isSessionDay && isSessionTime)
    }

    checkLiveSession()

    const interval = setInterval(checkLiveSession, 60000) // cada minuto

    return () => clearInterval(interval)

  }, [])

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ChartSection />
      <Testimonials />
      <Instructor />
      <WhatYouLearn />
      <Schedule />
      <Pricing />
      {/*<div className="bg-black text-white text-center py-20">

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Empieza hoy y accede a las sesiones en vivo
        </h2>

        <p className="text-gray-400 mb-6">
          No necesitas experiencia previa. Solo seguir el sistema paso a paso.
        </p>

        <a
          href="/login"
          className="inline-block bg-green-500 text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-green-400 transition"
        >
          🚀 Empezar ahora
        </a>

      </div>
      {/* FOOTER */}
      <footer className="bg-black text-white py-12 text-center">
        <p className="text-gray-600">
          © 2026 Trading Academy. Todos los derechos reservados.
        </p>
      </footer>
      <a
        href="https://wa.me/13055551234?text=Hola%20quiero%20información%20sobre%20las%20sesiones%20de%20trading"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-full shadow-xl transition-all duration-300 hover:scale-105">

          {/* ICONO */}
          <span className="text-xl"><MessageCircle size={20} /></span>

          {/* TEXTO */}
          <span className="text-sm font-semibold hidden sm:block">
            Hablar por WhatsApp
          </span>

        </div>

        {/* EFECTO PULSO */}
        <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping"></span>
      </a>
    </main >

  )
}