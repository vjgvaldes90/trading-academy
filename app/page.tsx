"use client"
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
import ImportantDisclaimer from "@/components/landing/ImportantDisclaimer"
import SiteFooter from "@/components/shared/SiteFooter"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ChartSection />
      <Testimonials />
      <Instructor />
      <WhatYouLearn />
      <Schedule />
      <Pricing />
      <ImportantDisclaimer />
      <SiteFooter />
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