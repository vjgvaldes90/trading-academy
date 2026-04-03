"use client"

import { STUDENT_STORAGE_KEY } from "@/lib/studentLocalStorage"
import { LogOut } from "lucide-react"
import styles from "./DashboardHeader.module.css"

type DashboardHeaderProps = {
    welcomeName: string
}

export default function DashboardHeader({ welcomeName }: DashboardHeaderProps) {
    return (
        <header className={styles.wrap}>
            <div className={styles.title}>Dashboard</div>
            <div className={styles.right}>
                <span className={styles.welcome}>Welcome, {welcomeName}</span>
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
