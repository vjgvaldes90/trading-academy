"use client"

import { motion } from "framer-motion"
import {
    availabilityStyles,
    getAvailabilityTone,
    type AvailabilityTone,
} from "@/lib/sessionAvailability"

type SessionAvailabilityBadgeProps = {
    available: number
    maxSlots: number
    tone?: AvailabilityTone
    compact?: boolean
    animatePulse?: boolean
}

export default function SessionAvailabilityBadge({
    available,
    maxSlots,
    tone: toneProp,
    compact = false,
    animatePulse = false,
}: SessionAvailabilityBadgeProps) {
    const tone = toneProp ?? getAvailabilityTone(available)
    const s = availabilityStyles[tone]

    return (
        <motion.span
            layout
            initial={false}
            animate={
                animatePulse
                    ? { scale: [1, 1.1, 1] }
                    : false
            }
            transition={{ duration: 0.42, ease: "easeOut" }}
            style={{
                fontSize: compact ? 10 : 11,
                fontWeight: 800,
                color: s.accent,
                background: `${s.accent}18`,
                padding: compact ? "4px 8px" : "5px 10px",
                borderRadius: 999,
                whiteSpace: "nowrap",
                flexShrink: 0,
                border: `1px solid ${s.accent}33`,
                boxShadow: compact ? `0 0 14px ${s.glow}` : `0 0 18px ${s.glow}`,
            }}
        >
            {available}/{maxSlots}
        </motion.span>
    )
}
