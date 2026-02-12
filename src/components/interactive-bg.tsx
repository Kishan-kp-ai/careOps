"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  baseX: number
  baseY: number
}

export function InteractiveBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = document.documentElement.scrollHeight
      initParticles()
    }

    const initParticles = () => {
      const count = Math.floor((canvas.width * canvas.height) / 25000)
      const particles: Particle[] = []
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3 + 0.1,
        })
      }
      particlesRef.current = particles
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const mouse = mouseRef.current
      const particles = particlesRef.current
      const maxDist = 100
      const mouseRadius = 150

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        const dxm = p.x - mouse.x
        const dym = p.y - mouse.y
        const distM = Math.sqrt(dxm * dxm + dym * dym)

        if (distM < mouseRadius) {
          const force = (mouseRadius - distM) / mouseRadius
          p.x += (dxm / distM) * force * 2.5
          p.y += (dym / distM) * force * 2.5
        } else {
          p.x += (p.baseX - p.x) * 0.01 + p.vx
          p.y += (p.baseY - p.y) * 0.01 + p.vy
        }

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(148,163,184,${p.opacity})`
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.08
            ctx.beginPath()
            ctx.strokeStyle = `rgba(148,163,184,${opacity})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }

        if (distM < mouseRadius * 1.5) {
          const opacity = (1 - distM / (mouseRadius * 1.5)) * 0.15
          ctx.beginPath()
          ctx.strokeStyle = `rgba(99,102,241,${opacity})`
          ctx.lineWidth = 0.6
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY + window.scrollY }
    }

    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    const handleScroll = () => {
      const newH = document.documentElement.scrollHeight
      if (canvas.height !== newH) canvas.height = newH
    }

    resize()
    animate()

    window.addEventListener("resize", resize)
    window.addEventListener("mousemove", handleMouse)
    window.addEventListener("mouseleave", handleLeave)
    window.addEventListener("scroll", handleScroll)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouse)
      window.removeEventListener("mouseleave", handleLeave)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
