"use client"

import { LogOut } from "lucide-react"
import { clearStoredStudent } from "@/lib/studentLocalStorage"

type HeaderProps = {
    welcomeName?: string | null
}

export default function Header({ welcomeName }: HeaderProps) {
    return (
        <div style={{
            width: "100%",
            padding: "14px 18px",
            background: "#020617",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
        }}>

            <div style={{ color: "white", fontWeight: 900, letterSpacing: 0.2, flexShrink: 0 }}>
                Smart Option Academy
            </div>

            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, minWidth: 0 }}>
                {welcomeName ? (
                    <span
                        style={{
                            color: "#cbd5e1",
                            fontSize: 14,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "min(280px, 42vw)",
                        }}
                    >
                        Welcome, {welcomeName}
                    </span>
                ) : null}
            <button
                onClick={() => {
                    clearStoredStudent()
                    fetch("/api/logout", { method: "POST", credentials: "include" }).finally(() => {
                        window.location.href = "/login"
                    })
                }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "transparent",
                    color: "#fecaca",
                    border: "1px solid rgba(239,68,68,0.45)",
                    padding: "9px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 800,
                    transition: "transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.10)"
                    e.currentTarget.style.transform = "translateY(-1px)"
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(239,68,68,0.18)"
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "none"
                }}
            >
                <LogOut size={16} />
                Salir
            </button>
            </div>
        </div>
    )
}