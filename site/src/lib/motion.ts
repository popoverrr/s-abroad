import { useEffect, useState } from 'react'

const mq = () => window.matchMedia('(prefers-reduced-motion: reduce)')
export const prefersReducedMotion = () => mq().matches

export function useMedia(query: string) {
  const [v, setV] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setV(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return v
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')

/** Intro plays once per session (sessionStorage); ?intro=1 forces it, reduced motion disables it. */
const KEY = 'sa-intro-seen'
export function shouldPlayIntro(): boolean {
  if (prefersReducedMotion()) return false
  const q = new URLSearchParams(location.search)
  if (q.has('og')) return false
  if (q.get('intro') === '1') return true
  if (q.get('intro') === '0') return false
  try {
    if (sessionStorage.getItem(KEY)) return false
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked: play every time */
  }
  return true
}

/** Deterministic pseudo-random in [0,1) by index — identical on every render. */
export const seeded = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
