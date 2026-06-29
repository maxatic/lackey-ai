'use client'

import { useEffect, useRef } from 'react'

// Warm palette (Lackey AI light theme). Base dots are a faint warm grey;
// dots near the cursor interpolate toward terracotta --accent and swell.
const BASE_RGB = { r: 217, g: 203, b: 184 } // #d9cbb8 warm grey
const ACTIVE_RGB = { r: 200, g: 73, b: 43 } // #c8492b terracotta accent

// Tuning (ported from the reference, gentled for a warm marketing backdrop).
const DOT_SIZE = 5
const GAP = 26
const PROXIMITY = 130
const ACTIVE_GROWTH = 2.2 // dot radius multiplier at the cursor
const SPEED_TRIGGER = 100 // px/s before a fast move pushes dots
const SHOCK_RADIUS = 240
const SHOCK_STRENGTH = 5
const MAX_SPEED = 5000
const RESISTANCE = 750
const RETURN_DURATION = 1.5

type Dot = {
  cx: number
  cy: number
  xOffset: number
  yOffset: number
  vx: number
  vy: number
}

export function DotGrid({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let w = 1
    let h = 1
    const dots: Dot[] = []

    const buildGrid = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      w = rect.width
      h = rect.height

      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cell = DOT_SIZE + GAP
      const cols = Math.floor((w + GAP) / cell)
      const rows = Math.floor((h + GAP) / cell)
      const startX = (w - (cell * cols - GAP)) / 2 + DOT_SIZE / 2
      const startY = (h - (cell * rows - GAP)) / 2 + DOT_SIZE / 2

      dots.length = 0
      for (let yy = 0; yy < rows; yy++) {
        for (let xx = 0; xx < cols; xx++) {
          dots.push({
            cx: startX + xx * cell,
            cy: startY + yy * cell,
            xOffset: 0,
            yOffset: 0,
            vx: 0,
            vy: 0,
          })
        }
      }
    }

    const drawDot = (x: number, y: number, radius: number, style: string) => {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = style
      ctx.fill()
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h)
      const style = `rgb(${BASE_RGB.r},${BASE_RGB.g},${BASE_RGB.b})`
      for (const dot of dots) drawDot(dot.cx, dot.cy, DOT_SIZE / 2, style)
    }

    buildGrid()

    // Reduced motion: draw once, no rAF, no cursor reaction.
    if (reduceMotion) {
      drawStatic()
      const ro = new ResizeObserver(() => {
        buildGrid()
        drawStatic()
      })
      ro.observe(parent)
      return () => ro.disconnect()
    }

    // Pointer position is stored in canvas-local coords.
    const pointer = { x: -1e4, y: -1e4, lastX: 0, lastY: 0, lastTime: 0 }
    const proxSq = PROXIMITY * PROXIMITY
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dtMs = Math.min(32, now - last)
      last = now
      const dt = dtMs / 1000

      ctx.clearRect(0, 0, w, h)

      const { x: px, y: py } = pointer
      const omega = 8 / Math.max(0.05, RETURN_DURATION)
      const k = omega * omega
      const c = 2 * omega
      const drag = Math.exp(-dtMs / Math.max(60, RESISTANCE))

      for (const dot of dots) {
        // Spring the offset back toward the dot's home position.
        dot.vx += (-k * dot.xOffset - c * dot.vx) * dt
        dot.vy += (-k * dot.yOffset - c * dot.vy) * dt
        dot.vx *= drag
        dot.vy *= drag
        dot.xOffset += dot.vx * dt
        dot.yOffset += dot.vy * dt

        const dx = dot.cx - px
        const dy = dot.cy - py
        const dsq = dx * dx + dy * dy

        let radius = DOT_SIZE / 2
        let style = `rgb(${BASE_RGB.r},${BASE_RGB.g},${BASE_RGB.b})`
        if (dsq <= proxSq) {
          const t = 1 - Math.sqrt(dsq) / PROXIMITY
          const r = Math.round(BASE_RGB.r + (ACTIVE_RGB.r - BASE_RGB.r) * t)
          const g = Math.round(BASE_RGB.g + (ACTIVE_RGB.g - BASE_RGB.g) * t)
          const b = Math.round(BASE_RGB.b + (ACTIVE_RGB.b - BASE_RGB.b) * t)
          style = `rgb(${r},${g},${b})`
          radius *= 1 + (ACTIVE_GROWTH - 1) * t
        }

        drawDot(dot.cx + dot.xOffset, dot.cy + dot.yOffset, radius, style)
      }
    }

    // Convert a window event into canvas-local coords.
    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      const dtMs = pointer.lastTime ? now - pointer.lastTime : 16
      const cdx = e.clientX - pointer.lastX
      const cdy = e.clientY - pointer.lastY
      let vx = (cdx / dtMs) * 1000
      let vy = (cdy / dtMs) * 1000
      let sp = Math.hypot(vx, vy)
      if (sp > MAX_SPEED) {
        const s = MAX_SPEED / sp
        vx *= s
        vy *= s
        sp = MAX_SPEED
      }
      pointer.lastTime = now
      pointer.lastX = e.clientX
      pointer.lastY = e.clientY

      const { x, y } = toLocal(e.clientX, e.clientY)
      pointer.x = x
      pointer.y = y

      if (sp <= SPEED_TRIGGER) return
      for (const dot of dots) {
        const dist = Math.hypot(dot.cx - x, dot.cy - y)
        if (dist < PROXIMITY) {
          const fall = 1 - dist / PROXIMITY
          dot.vx += (dot.cx - x + vx * 0.01) * fall * 12
          dot.vy += (dot.cy - y + vy * 0.01) * fall * 12
        }
      }
    }

    const onDown = (e: PointerEvent) => {
      const { x, y } = toLocal(e.clientX, e.clientY)
      for (const dot of dots) {
        const dist = Math.hypot(dot.cx - x, dot.cy - y)
        if (dist < SHOCK_RADIUS) {
          const falloff = 1 - dist / SHOCK_RADIUS
          dot.vx += (dot.cx - x) * SHOCK_STRENGTH * falloff * 18
          dot.vy += (dot.cy - y) * SHOCK_STRENGTH * falloff * 18
        }
      }
    }

    const ro = new ResizeObserver(buildGrid)
    ro.observe(parent)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })

    // Only run the rAF loop while the grid is on screen — saves CPU/heat once
    // the user scrolls past the hero.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !raf) {
          last = performance.now()
          raf = requestAnimationFrame(tick)
        } else if (!entry.isIntersecting && raf) {
          cancelAnimationFrame(raf)
          raf = 0
        }
      },
      { threshold: 0 },
    )
    io.observe(parent)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-auto absolute inset-0 block h-full w-full ${className}`}
    />
  )
}
