/**
 * Umbrales y copys: ajusta aquí sin tocar UI ni contexto.
 * Para reglas más complejas, añade entradas en `strategies.ts`.
 */
export const assistConfig = {
    idle: {
        /** ms sin actividad antes de sugerencia suave. */
        thresholdMs: 55_000,
    },
    failure: {
        /** Intentos fallidos acumulados en un channel para disparar ayuda. */
        thresholdByChannel: {
            booking: 2,
            default: 2,
        } as Record<string, number>,
    },
    ui: {
        /** Tras cerrar o “ahora no”, no molestar durante este tiempo. */
        snoozeAfterDismissMs: 120_000,
        pollIntervalMs: 12_000,
    },
    copy: {
        idle: {
            title: "¿Sigues por aquí?",
            body: "Llevas un momento sin actividad. Si te atasca algo, podemos orientarte.",
        },
        bookingFailures: {
            title: "¿Algo no salió bien?",
            body: "Varios intentos de reserva fallaron. Comprueba conexión o acceso activo.",
        },
        genericFailures: {
            title: "Parece que hay fricción",
            body: "Si quieres, te guiamos paso a paso.",
        },
    },
} as const
