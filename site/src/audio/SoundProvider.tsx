import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dingDong, ensureAudio, flapClick, hoverTick, isUnlockHeld, sharedAudioContext, thud } from './sound'

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

// v6: sound is ALWAYS on at page load. Turning it off (header button) lasts until reload only — nothing is stored.
try {
  localStorage.removeItem('sa-sound') // key from v5, no longer used
} catch {
  /* storage blocked */
}

/** Create/resume inside the current user gesture, then chime once the context actually runs. */
function startWithChime() {
  const c = ensureAudio()
  if (!c) return
  if (c.state === 'running') dingDong()
  else void c.resume().then(dingDong)
}

export function SoundProvider({ children }: { children: ReactNode }) {
  // Browsers still block audio until the first user action: the language gate click (or the first touch) unlocks it.
  const [on, setOn] = useState(true)
  const onRef = useRef(on)
  onRef.current = on

  // Every gesture (capture) creates/resumes the one shared AudioContext while sound is on — covers ?lang= visits
  // without the gate and contexts that iOS left "suspended"/"interrupted". Returning to the tab resumes it too.
  // No welcome chime here. While the language gate is open it handles audio itself.
  useEffect(() => {
    const evs = ['pointerdown', 'keydown', 'touchend'] as const
    const wake = () => {
      if (!onRef.current || isUnlockHeld()) return
      ensureAudio() // creates the context on the first gesture, resume()s it afterwards
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !onRef.current) return
      const c = sharedAudioContext()
      if (c && c.state !== 'running') void c.resume().catch(() => {})
    }
    evs.forEach((e) => window.addEventListener(e, wake, true))
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      evs.forEach((e) => window.removeEventListener(e, wake, true))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const set = useCallback((next: boolean, opts: { chime?: boolean } = {}) => {
    onRef.current = next
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

  // Test hook (docs/09 acceptance): the shared AudioContext state (never creates one) + the on/off switch.
  useEffect(() => {
    ;(window as unknown as { __audioState?: () => { state: string; enabled: boolean } }).__audioState = () => ({
      state: sharedAudioContext()?.state ?? 'none',
      enabled: onRef.current,
    })
    // emulates the OS suspending audio while the tab is in the background
    ;(window as unknown as { __audioSuspend?: () => Promise<void> | undefined }).__audioSuspend = () => sharedAudioContext()?.suspend()
  }, [])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const c = useContext(SoundContext)
  if (!c) throw new Error('useSound outside provider')
  return c
}
