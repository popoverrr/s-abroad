import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dingDong, ensureAudio, flapClick, hoverTick, isUnlockHeld, sharedAudioContext, thud } from './sound'

const KEY = 'sa-sound'
type Ctx = {
  on: boolean
  toggle: () => void
  /** Set the state explicitly (language gate). chime: create/resume the context in this gesture and play the ding-dong. */
  set: (on: boolean, opts?: { chime?: boolean }) => void
  click: () => void
  stamp: () => void
  tick: () => void
}
const SoundContext = createContext<Ctx | null>(null)

/** Sound is ON by default (v5); only an explicit "off" is remembered and respected. */
function readStored() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
function store(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* storage blocked */
  }
}

/** Create/resume inside the current user gesture, then chime once the context actually runs. */
function startWithChime() {
  const c = ensureAudio()
  if (!c) return
  if (c.state === 'running') dingDong()
  else void c.resume().then(dingDong)
}

export function SoundProvider({ children }: { children: ReactNode }) {
  // A remembered "on" still needs a gesture: browsers block audio until the first user action.
  const [on, setOn] = useState(readStored)
  const onRef = useRef(on)
  onRef.current = on

  // Returning visitor: unlock on the first gesture anywhere (capture), silently — no welcome chime.
  // While the language gate is open it handles audio itself (its sound switch must not create a context).
  useEffect(() => {
    if (!on) return
    const evs = ['pointerdown', 'keydown', 'touchend'] as const
    const unlock = () => {
      if (isUnlockHeld()) return
      const c = ensureAudio()
      if (c && c.state === 'running') remove()
      else void c?.resume().then(() => c.state === 'running' && remove())
    }
    const remove = () => evs.forEach((e) => window.removeEventListener(e, unlock, true))
    evs.forEach((e) => window.addEventListener(e, unlock, true))
    return remove
  }, [on])

  const set = useCallback((next: boolean, opts: { chime?: boolean } = {}) => {
    store(next)
    setOn(next)
    if (next && opts.chime) startWithChime()
  }, [])

  const toggle = useCallback(() => {
    const next = !onRef.current
    set(next, { chime: next })
  }, [set])

  const value = useMemo<Ctx>(
    () => ({
      on,
      toggle,
      set,
      click: () => onRef.current && !document.hidden && flapClick(),
      stamp: () => onRef.current && thud(),
      tick: () => onRef.current && hoverTick(),
    }),
    [on, toggle, set],
  )
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const c = useContext(SoundContext)
  if (!c) throw new Error('useSound outside provider')
  return c
}

// Test hook (docs/08 acceptance): state of the shared AudioContext without creating one.
;(window as unknown as { __audioState?: () => string }).__audioState = () => sharedAudioContext()?.state ?? 'none'
