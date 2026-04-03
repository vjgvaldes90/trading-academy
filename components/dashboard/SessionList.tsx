"use client"

import { memo } from "react"
import { useSession } from "@/context/SessionContext"
import { DbSession } from "@/lib/sessions"
import SessionCard from "./SessionCard"

type SessionListProps = {
    sessions: DbSession[]
}

function SessionListComponent({ sessions }: SessionListProps) {
    const { updatedSessionIds } = useSession()

    return (
        <div
            id="session-list-scroll"
            className="box-border grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-x-hidden overflow-y-auto p-3 backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3"
            style={{
                color: "var(--ds-text-secondary)",
                borderRadius: "var(--ds-r-lg)",
                border: "1px solid var(--ds-border)",
                background: "var(--ds-surface)",
                boxShadow: "var(--ds-shadow-card)",
            }}
        >
            {sessions.map((s) => (
                <SessionCard
                    key={s.id}
                    session={s}
                    isUpdated={updatedSessionIds.includes(s.id)}
                />
            ))}
        </div>
    )
}

const SessionList = memo(SessionListComponent)
SessionList.displayName = "SessionList"

export default SessionList
