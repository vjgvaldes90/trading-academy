import { assistConfig } from "./config"
import { ASSIST_CHANNELS } from "./channels"
import type { AssistSuggestion, LearningSnapshot } from "./types"

function failureThreshold(channel: string): number {
    const map = assistConfig.failure.thresholdByChannel
    return map[channel] ?? map.default ?? 2
}

/**
 * Selector puro: facilita tests y futuro reemplazo por modelo IA
 * (misma firma: snapshot + now → sugerencia | null).
 */
export function selectSuggestion(snapshot: LearningSnapshot, now: number): AssistSuggestion | null {
    if (snapshot.helpSnoozedUntil != null && now < snapshot.helpSnoozedUntil) {
        return null
    }

    const candidates: AssistSuggestion[] = []

    for (const [channel, count] of Object.entries(snapshot.failedAttemptsByChannel)) {
        if (count >= failureThreshold(channel)) {
            const isBooking = channel === ASSIST_CHANNELS.booking
            candidates.push({
                id: `failure:${channel}`,
                title: isBooking
                    ? assistConfig.copy.bookingFailures.title
                    : assistConfig.copy.genericFailures.title,
                body: isBooking ? assistConfig.copy.bookingFailures.body : assistConfig.copy.genericFailures.body,
                priority: 20,
                meta: { channel, failures: count },
            })
        }
    }

    const idleMs = now - snapshot.lastInteractionAt
    if (idleMs >= assistConfig.idle.thresholdMs) {
        candidates.push({
            id: "idle:soft",
            title: assistConfig.copy.idle.title,
            body: assistConfig.copy.idle.body,
            priority: 10,
            meta: { idleMs },
        })
    }

    if (candidates.length === 0) return null
    return candidates.sort((a, b) => b.priority - a.priority)[0] ?? null
}
