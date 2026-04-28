"use client"

import { STUDENT_STORAGE_KEY } from "@/lib/studentLocalStorage"
import { LogOut } from "lucide-react"
import styles from "./DashboardHeader.module.css"

type DashboardHeaderProps = {
    welcomeName: string
    showCancelSubscription?: boolean
    onCancelSubscription?: () => void
    isCancellingSubscription?: boolean
}

export default function DashboardHeader({
    welcomeName,
    showCancelSubscription = false,
    onCancelSubscription,
    isCancellingSubscription = false,
}: DashboardHeaderProps) {
    return (
        <header className={styles.wrap}>
            <div className={styles.title}>Dashboard</div>
            <div className={styles.right}>
                <span className={styles.welcome}>Welcome, {welcomeName}</span>
                {showCancelSubscription ? (
                    <button
                        type="button"
                        onClick={onCancelSubscription}
                        disabled={isCancellingSubscription}
                        className="ml-2 rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isCancellingSubscription ? "Cancelling..." : "Cancel Subscription"}
                    </button>
                ) : null}
                <button
                    type="button"
                    className={styles.logout}
                    onClick={() => {
                        localStorage.removeItem(STUDENT_STORAGE_KEY)
                        window.location.href = "/login"
                    }}
                >
                    <LogOut size={16} aria-hidden />
                    Logout
                </button>
            </div>
        </header>
    )
}
