import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://smartoptionacademy.com"
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/success`, changeFrequency: "yearly", priority: 0.4 },
  ]
}
