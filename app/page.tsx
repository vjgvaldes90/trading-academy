"use client"
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
    </main>
  )
}
