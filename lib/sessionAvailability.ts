export type AvailabilityTone = "available" | "low" | "full"

export function getAvailabilityTone(available: number): AvailabilityTone {
    if (available <= 0) return "full"
    if (available <= 2) return "low"
    return "available"
}

/** Leyenda corta bajo la fila (lista / detalle). */
export function getAvailabilityCaption(available: number): string | null {
    if (available <= 0) return "Sin cupos"
    if (available === 1) return "Última plaza disponible"
    if (available === 2) return "Quedan 2 cupos"
    return null
}

export const availabilityStyles: Record<
    AvailabilityTone,
    { accent: string; glow: string; label: string }
> = {
    available: {
        accent: "#34d399",
        glow: "rgba(16,185,129,0.35)",
        label: "Disponible",
    },
    low: {
        accent: "#fbbf24",
        glow: "rgba(251,191,36,0.35)",
        label: "Pocos cupos",
    },
    full: {
        accent: "#f87171",
        glow: "rgba(248,113,113,0.3)",
        label: "Completo",
    },
}
