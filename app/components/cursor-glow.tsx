"use client"

import { useEffect, useRef } from "react"

interface CursorGlowProps {
  size?: number
  opacity?: number
  hoverOnly?: boolean
}

export function CursorGlow({ size = 400, opacity = 0.3, hoverOnly = false }: CursorGlowProps) {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX - size / 2}px`
        glowRef.current.style.top = `${e.clientY - size / 2}px`
        glowRef.current.style.opacity = (opacity * 0.6).toString()
      }
    }

    const handleMouseLeave = () => {
      if (glowRef.current && hoverOnly) {
        glowRef.current.style.opacity = "0"
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [size, opacity, hoverOnly])

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-2xl transition-opacity duration-300"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        opacity: hoverOnly ? 0 : opacity * 0.6,
      }}
      aria-hidden="true"
    />
  )
}
