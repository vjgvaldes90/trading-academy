"use client"

import { memo } from "react"
import { useSession } from "@/context/SessionContext"
import { DbSession } from "@/lib/sessions"
import SessionCard from "./SessionCard"

type SessionListProps = {
    sessions: DbSession[]
}

function SessionListComponent({ sessions }: SessionListProps) {
    const { updatedSessionIds, sessionBookingError, sessionBookingSuccess } = useSession()

    return (
        <div
            id="session-list-scroll"
            className="box-border flex min-h-0 flex-1 flex-col overflow-hidden"
            style={{
                color: "var(--ds-text-secondary)",
                borderRadius: "var(--ds-r-lg)",
                border: "1px solid var(--ds-border)",
                background: "var(--ds-surface)",
                boxShadow: "var(--ds-shadow-card)",
            }}
        >
            {sessionBookingError ? (
                <p
                    role="alert"
                    className="shrink-0 border-b border-red-500/20 bg-red-950/30 px-3 py-2 text-center text-xs font-semibold text-red-300"
                >
                    {sessionBookingError}
                </p>
            ) : null}
            {sessionBookingSuccess ? (
                <p className="shrink-0 border-b border-emerald-500/20 bg-emerald-950/25 px-3 py-2 text-center text-xs font-semibold text-emerald-400">
                    {sessionBookingSuccess}
                </p>
            ) : null}
            <div className="box-border grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-x-hidden overflow-y-auto p-3 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            {sessions.map((s) => (
                <SessionCard
                    key={s.id}
                    session={s}
                    isUpdated={updatedSessionIds.includes(s.id)}
                />
            ))}
            </div>
        </div>
    )
}

const SessionList = memo(SessionListComponent)
SessionList.displayName = "SessionList"

export default SessionList
