"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useState } from "react"

const ACCESS_TYPE_OPTIONS = ["free", "paid", "vip", "discount"] as const

export type CreateStudentAccessType = (typeof ACCESS_TYPE_OPTIONS)[number]

export type CreateStudentFormValues = {
    firstName: string
    lastName: string
    email: string
    phone: string
    accessType: CreateStudentAccessType
}

type CreateStudentModalProps = {
    open: boolean
    onClose: () => void
    onSubmit: (values: CreateStudentFormValues) => void
}

const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(59,130,246,0.25)",
    background: "rgba(15,23,42,0.85)",
    color: "#f8fafc",
    fontSize: "0.9375rem",
    outline: "none",
}

const labelStyle: CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: "0.02em",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string): boolean {
    return EMAIL_RE.test(value.trim())
}

export default function CreateStudentModal({ open, onClose, onSubmit }: CreateStudentModalProps) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [accessType, setAccessType] = useState<CreateStudentAccessType>("free")

    useEffect(() => {
        if (!open) return
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setAccessType("free")
    }, [open])

    if (!open) return null

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const trimmedEmail = email.trim()
    const isValid =
        trimmedFirst.length > 0 && trimmedLast.length > 0 && isValidEmail(trimmedEmail)

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (!isValid) return
        onSubmit({
            firstName: trimmedFirst,
            lastName: trimmedLast,
            email: trimmedEmail.toLowerCase(),
            phone: phone.trim(),
            accessType,
        })
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-student-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                background: "rgba(0,0,0,0.72)",
            }}
            onClick={onClose}
        >
            <div
                onClick={(ev) => ev.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 16,
                    border: "1px solid rgba(59,130,246,0.3)",
                    background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 40px rgba(37,99,235,0.15)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "16px 18px",
                        borderBottom: "1px solid rgba(59,130,246,0.2)",
                    }}
                >
                    <h2
                        id="create-student-title"
                        style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}
                    >
                        New Student
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "1px solid rgba(148,163,184,0.35)",
                            background: "rgba(15,23,42,0.8)",
                            color: "#e2e8f0",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                        }}
                    >
                        Close
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "18px 18px 20px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="create-student-first-name" style={labelStyle}>
                            First Name
                        </label>
                        <input
                            id="create-student-first-name"
                            type="text"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="create-student-last-name" style={labelStyle}>
                            Last Name
                        </label>
                        <input
                            id="create-student-last-name"
                            type="text"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="create-student-email" style={labelStyle}>
                            Email
                        </label>
                        <input
                            id="create-student-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label htmlFor="create-student-phone" style={labelStyle}>
                            Phone
                        </label>
                        <input
                            id="create-student-phone"
                            type="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: 18 }}>
                        <label htmlFor="create-student-access-type" style={labelStyle}>
                            Access Type
                        </label>
                        <select
                            id="create-student-access-type"
                            value={accessType}
                            onChange={(e) => setAccessType(e.target.value as CreateStudentAccessType)}
                            style={inputStyle}
                        >
                            {ACCESS_TYPE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!isValid}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(250,204,21,0.45)",
                            background: !isValid
                                ? "rgba(100,100,100,0.4)"
                                : "linear-gradient(180deg, #facc15 0%, #ca8a04 100%)",
                            color: !isValid ? "#94a3b8" : "#0f172a",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            cursor: !isValid ? "not-allowed" : "pointer",
                            boxShadow: !isValid ? "none" : "0 4px 14px rgba(250,204,21,0.25)",
                            transition: "all 0.2s ease",
                        }}
                    >
                        Create Student
                    </button>
                </form>
            </div>
        </div>
    )
}
