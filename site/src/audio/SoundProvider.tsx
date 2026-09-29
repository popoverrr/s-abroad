import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dingDong, ensureAudio, flapClick, hoverTick, thud } from './sound'

const KEY = 'sa-sound'
type Ctx = {
  on: boolean
  toggle: () => void
  click: () => void
  stamp: () => void
  tick: () => void
}
const SoundContext = createContext<Ctx | null>(null)

function readStored() {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  // Off by default; a remembered "on" still needs a gesture before any sound plays.
  const [on, setOn] = useState(readStored)
  const onRef = useRef(on)
  onRef.current = on

  useEffect(() => {
    if (!on) return
    const unlock = () => ensureAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [on])

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off')
      } catch {
        /* storage blocked */
      }
      if (next) {
        const c = ensureAudio()
        // resume() is async on first creation; chime once it runs.
        if (c && c.state !== 'running') void c.resume().then(dingDong)
        else dingDong()
      }
      return next
    })
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      on,
      toggle,
      click: () => onRef.current && flapClick(),
      stamp: () => onRef.current && thud(),
      tick: () => onRef.current && hoverTick(),
    }),
    [on, toggle],
  )
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const c = useContext(SoundContext)
  if (!c) throw new Error('useSound outside provider')
  return c
}
