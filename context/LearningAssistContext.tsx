"use client"

import {
    assistConfig,
} from "@/lib/assist/config"
import { selectSuggestion } from "@/lib/assist/selectSuggestion"
import type {
    AssistChannel,
    AssistSuggestion,
    LearningAssistActions,
    LearningSnapshot,
} from "@/lib/assist/types"
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

type LearningAssistContextValue = LearningAssistActions & {
    snapshot: LearningSnapshot
    activeSuggestion: AssistSuggestion | null
    openHelp: () => void
    closeHelp: () => void
    isHelpPanelOpen: boolean
}

const LearningAssistContext = createContext<LearningAssistContextValue | null>(null)

function createInitialSnapshot(): LearningSnapshot {
    const t = Date.now()
    return {
        failedAttemptsByChannel: {},
        lastInteractionAt: t,
        lastFailureAt: null,
        helpSnoozedUntil: null,
        sessionStartedAt: t,
    }
}

export function LearningAssistProvider({ children }: { children: React.ReactNode }) {
    const [snapshot, setSnapshot] = useState<LearningSnapshot>(createInitialSnapshot)
    const [now, setNow] = useState(() => Date.now())
    const [isHelpPanelOpen, setHelpPanelOpen] = useState(false)

    const poke = useCallback(() => {
        const t = Date.now()
        setSnapshot((s) => ({ ...s, lastInteractionAt: t }))
    }, [])

    const recordFailure = useCallback((channel: AssistChannel, increment: number = 1) => {
        const t = Date.now()
        setSnapshot((s) => ({
            ...s,
            lastFailureAt: t,
            lastInteractionAt: t,
            failedAttemptsByChannel: {
                ...s.failedAttemptsByChannel,
                [channel]: (s.failedAttemptsByChannel[channel] ?? 0) + increment,
            },
        }))
    }, [])

    const clearFailures = useCallback((channel: AssistChannel) => {
        setSnapshot((s) => {
            const next = { ...s.failedAttemptsByChannel }
            delete next[channel]
            return { ...s, failedAttemptsByChannel: next }
        })
    }, [])

    const snooze = useCallback((ms: number) => {
        const until = Date.now() + ms
        setSnapshot((s) => ({ ...s, helpSnoozedUntil: until }))
    }, [])

    const dismissCurrent = useCallback(() => {
        snooze(assistConfig.ui.snoozeAfterDismissMs)
    }, [snooze])

    const openHelp = useCallback(() => {
        setHelpPanelOpen(true)
        poke()
    }, [poke])

    const closeHelp = useCallback(() => {
        setHelpPanelOpen(false)
    }, [])

    useEffect(() => {
        const events = ["pointerdown", "keydown", "scroll", "touchstart", "wheel"] as const
        const onAct = () => poke()
        events.forEach((e) => window.addEventListener(e, onAct, { passive: true }))
        return () => events.forEach((e) => window.removeEventListener(e, onAct))
    }, [poke])

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), assistConfig.ui.pollIntervalMs)
        return () => window.clearInterval(id)
    }, [])

    const activeSuggestion = useMemo(() => selectSuggestion(snapshot, now), [snapshot, now])

    const value = useMemo<LearningAssistContextValue>(
        () => ({
            snapshot,
            activeSuggestion,
            poke,
            recordFailure,
            clearFailures,
            snooze,
            dismissCurrent,
            openHelp,
            closeHelp,
            isHelpPanelOpen,
        }),
        [
            snapshot,
            activeSuggestion,
            poke,
            recordFailure,
            clearFailures,
            snooze,
            dismissCurrent,
            openHelp,
            closeHelp,
            isHelpPanelOpen,
        ]
    )

    return (
        <LearningAssistContext.Provider value={value}>{children}</LearningAssistContext.Provider>
    )
}

export function useLearningAssistContext() {
    const ctx = useContext(LearningAssistContext)
    if (!ctx) throw new Error("useLearningAssistContext must be used within LearningAssistProvider")
    return ctx
}
