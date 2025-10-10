"use client"

import { useEffect, useState } from "react"

type Props = {
  size?: number
  opacity?: number
  colorVar?: string
  className?: string
  hoverOnly?: boolean
}

export function CursorGlow({
  size = 600,
  opacity = 0.35,
  colorVar = "var(--brand-red-1)",
  className = "",
  hoverOnly = true,
}: Props) {
  const [pos, setPos] = useState<{ x: string; y: string }>({ x: "50%", y: "50%" })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      setPos({ x: `${x.toFixed(2)}%`, y: `${y.toFixed(2)}%` })
      if (hoverOnly) setVisible(true)
    }
    const onLeave = () => {
      if (hoverOnly) setVisible(false)
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseleave", onLeave, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseleave", onLeave)
    }
  }, [hoverOnly])

  const finalOpacity = hoverOnly ? (visible ? opacity : 0) : opacity

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={{
        background: `radial-gradient(${size}px circle at ${pos.x} ${pos.y}, ${colorVar}, rgba(0,0,0,0) 60%)`,
        opacity: finalOpacity,
        transition: "background-position 120ms ease-out, opacity 150ms ease-out",
      }}
      aria-hidden
    />
  )
}
