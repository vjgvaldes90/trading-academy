/** Identificadores de canal para contadores de fallos (evita typos en producto). */
export const ASSIST_CHANNELS = {
    booking: "booking",
    navigation: "navigation",
} as const

export type AssistChannelId = (typeof ASSIST_CHANNELS)[keyof typeof ASSIST_CHANNELS]
