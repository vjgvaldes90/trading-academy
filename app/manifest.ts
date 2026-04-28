import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Option Academy",
    short_name: "SOA",
    description:
      "Plataforma premium de mentoría en trading con sesiones en vivo, análisis institucional y formación profesional.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
