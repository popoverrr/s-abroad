import { useEffect, useRef, useState } from 'react'
import type { Arc, Globe as CobeGlobe, Marker } from 'cobe'
import { site } from '../lib/site'
import { prefersReducedMotion } from '../lib/motion'

// v2 palette: Almaty in gold, destinations in mint.
const GOLD: [number, number, number] = [0.894, 0.725, 0.416]
const MINT: [number, number, number] = [0.557, 0.82, 0.651]
const deg = Math.PI / 180

// Start between Almaty and Prague: cobe's phi for longitude L is π − (L·π/180 − π/2).
const CENTER_LNG = 40
const PHI0 = Math.PI - (CENTER_LNG * deg - Math.PI / 2)
const THETA0 = 0.42

function hasWebGL() {
  if (new URLSearchParams(location.search).has('nogl')) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const origin: [number, number] = [site.origin.lat, site.origin.lng]

/** Static fallback: orthographic projection of the same cities onto an SVG disc. */
function FallbackGlobe() {
  const lat0 = 45 * deg
  const lng0 = CENTER_LNG * deg
  const project = (lat: number, lng: number) => {
    const φ = lat * deg
    const λ = lng * deg - lng0
    const x = Math.cos(φ) * Math.sin(λ)
    const y = Math.cos(lat0) * Math.sin(φ) - Math.sin(lat0) * Math.cos(φ) * Math.cos(λ)
    return [50 + x * 46, 50 - y * 46]
  }
  const pts = [site.origin, ...site.destinations].map((p) => project(p.lat, p.lng))
  const [ax, ay] = pts[0]
  return (
    <svg className="globe-fallback" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="gf" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#17301f" />
          <stop offset="1" stopColor="#08140d" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#gf)" stroke="#1f3a2b" strokeWidth=".4" />
      {[-60, -30, 0, 30, 60].map((l) => (
        <ellipse key={l} cx="50" cy={50 - Math.sin(l * deg) * 46 * Math.cos(lat0)} rx={46 * Math.cos(l * deg)} ry={46 * Math.cos(l * deg) * Math.sin(lat0)} fill="none" stroke="#1a3326" strokeWidth=".25" />
      ))}
      {pts.slice(1).map(([x, y], i) => (
        <g key={i}>
          <path d={`M${ax} ${ay} Q ${(ax + x) / 2} ${Math.min(ay, y) - 10} ${x} ${y}`} fill="none" stroke="#E4B96A" strokeWidth=".3" opacity=".45" />
          <circle cx={x} cy={y} r=".9" fill="#8ED1A6" />
        </g>
      ))}
      <circle cx={ax} cy={ay} r="1.8" fill="#E4B96A" />
    </svg>
  )
}

export function Globe({ active, className = '' }: { active: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'loading' | 'gl' | 'fallback'>('loading')
  const pulse = useRef({ index: active, t: 0 })

  useEffect(() => {
    pulse.current = { index: active, t: performance.now() }
  }, [active])

  useEffect(() => {
    if (!hasWebGL()) {
      setMode('fallback')
      return
    }
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const reduced = prefersReducedMotion()
    let globe: CobeGlobe | null = null
    let raf = 0
    let destroyed = false
    let inView = true
    let phi = PHI0
    let theta = THETA0
    let vel = 0
    let dragX: number | null = null
    let dragY = 0
    let dirty = true
    let lastArc = -1

    const markers = (now: number): Marker[] => {
      const p = pulse.current
      const k = Math.max(0, 1 - (now - p.t) / 600)
      return [
        { location: origin, size: 0.028, color: GOLD },
        ...site.destinations.map((d, i) => ({
          location: [d.lat, d.lng] as [number, number],
          // The current board city swells ×1.8 for 600 ms, then stays slightly larger.
          size: 0.014 * (i === p.index ? 1.25 + 0.55 * Math.sin(k * Math.PI) : 1),
          color: MINT,
        })),
      ]
    }
    const arcs = (): Arc[] => {
      const d = site.destinations[pulse.current.index]
      return d ? [{ from: origin, to: [d.lat, d.lng] }] : []
    }

    const size = () => {
      const s = canvas.offsetWidth
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      return { w: s * dpr, dpr }
    }

    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!globe || !inView || document.hidden) return
      const now = performance.now()
      const pulsing = now - pulse.current.t < 700
      if (dragX === null) {
        if (!reduced) phi += 0.0025
        phi += vel
        vel *= 0.94
        if (Math.abs(vel) < 1e-5) vel = 0
      }
      if (reduced && !dirty && !pulsing && vel === 0 && dragX === null) return
      const next: Parameters<CobeGlobe['update']>[0] = { phi, theta, markers: markers(now) }
      if (lastArc !== pulse.current.index) {
        next.arcs = arcs()
        lastArc = pulse.current.index
      }
      globe.update(next)
      dirty = false
    }

    const start = async () => {
      const { default: createGlobe } = await import('cobe')
      if (destroyed) return
      const { w, dpr } = size()
      try {
        globe = createGlobe(canvas, {
          width: w,
          height: w,
          devicePixelRatio: dpr,
          phi,
          theta,
          dark: 1,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 5,
          baseColor: [0.13, 0.2, 0.16],
          markerColor: MINT,
          glowColor: [0.1, 0.24, 0.16],
          markers: markers(performance.now()),
          arcs: arcs(),
          arcColor: GOLD,
          arcWidth: 0.6,
          arcHeight: 0.28,
          markerElevation: 0.01,
        })
      } catch {
        setMode('fallback')
        return
      }
      lastArc = pulse.current.index
      setMode('gl')
      raf = requestAnimationFrame(frame)
    }

    // Load after the first paint, when the browser is idle.
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const kick = () => void start()
    let idleId = 0
    if (idle) idleId = idle(kick, { timeout: 600 })
    else idleId = window.setTimeout(kick, 120)

    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), { rootMargin: '80px' })
    io.observe(wrap)

    const ro = new ResizeObserver(() => {
      if (!globe) return
      const { w } = size()
      globe.update({ width: w, height: w })
      dirty = true
    })
    ro.observe(canvas)

    const down = (e: PointerEvent) => {
      dragX = e.clientX
      dragY = e.clientY
      vel = 0
      canvas.setPointerCapture(e.pointerId)
      canvas.classList.add('is-drag')
    }
    const move = (e: PointerEvent) => {
      if (dragX === null) return
      const dx = (e.clientX - dragX) * 0.005
      const dy = (e.clientY - dragY) * 0.003
      dragX = e.clientX
      dragY = e.clientY
      phi += dx
      theta = Math.max(-0.2, Math.min(0.9, theta + dy))
      vel = dx
      dirty = true
    }
    const up = () => {
      dragX = null
      canvas.classList.remove('is-drag')
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (idle) (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId)
      else clearTimeout(idleId)
      io.disconnect()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      globe?.destroy()
    }
  }, [])

  return (
    <div className={`globe ${className} globe--${mode}`} ref={wrapRef} aria-hidden="true">
      <div className="globe-glow" />
      {mode === 'fallback' ? <FallbackGlobe /> : <canvas ref={canvasRef} className="globe-canvas" />}
    </div>
  )
}
