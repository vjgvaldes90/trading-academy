import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://smartoptionacademy.com"),
  title: {
    default: "Smart Option Academy",
    template: "%s | Smart Option Academy",
  },
  description:
    "Academia elite de trading con mentoría institucional, sesiones en vivo y estrategias profesionales para traders en crecimiento.",
  keywords: [
    "Smart Option Academy",
    "trading",
    "mentoria trading",
    "sesiones en vivo",
    "forex",
    "futuros",
    "nasdaq",
  ],
  openGraph: {
    type: "website",
    locale: "es_US",
    url: "/",
    siteName: "Smart Option Academy",
    title: "Smart Option Academy",
    description:
      "Accede al ecosistema Smart Option Academy con mentoría institucional, análisis de mercado y sesiones en vivo.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Option Academy",
    description:
      "Plataforma premium de educación en trading con enfoque institucional y acompañamiento real.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
