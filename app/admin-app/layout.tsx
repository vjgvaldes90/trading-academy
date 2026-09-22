import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
    title: "Admin App",
    description: "Smart Option Academy private administrator console for mobile.",
    applicationName: "Smart Option Academy Admin",
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
    manifest: "/admin-app-manifest.webmanifest",
    appleWebApp: {
        capable: true,
        title: "SOA Admin",
        statusBarStyle: "black-translucent",
    },
    icons: {
        icon: [{ url: "/favicon.ico", sizes: "any" }],
        apple: [{ url: "/admin-app-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
}

export const viewport: Viewport = {
    themeColor: "#0B0F19",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
}

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[100dvh] bg-[#0B0F19] text-slate-100 antialiased">{children}</div>
    )
}
