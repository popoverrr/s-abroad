import { useCallback, useEffect, useRef, useState } from 'react'
import { site } from './lib/site'
import { useReducedMotion } from './lib/motion'
import { useI18n } from './i18n'
import { TopBar } from './components/TopBar'
import { Hero } from './components/Hero'
import { DepartureBoard } from './components/DepartureBoard'
import { Globe } from './components/Globe'
import { BoardingPass } from './components/BoardingPass'
import { Stamps } from './components/Stamps'
import { Footer, Grain } from './components/Footer'
import { StickyCta, Toast } from './components/Overlays'
import { Chooser, type ChooserVariant } from './components/Chooser'
import { useSound } from './audio/SoundProvider'
import { sharedAudioContext } from './audio/sound'
import type { PlaneEggHandle } from './egg/plane-egg'

const CITY_MS = 3200

function randomTime() {
  // 06:00–23:55, five-minute steps
  const m = 6 * 60 + Math.floor(Math.random() * ((23 * 60 + 55 - 6 * 60) / 5 + 1)) * 5
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Board cycles destinations every 3.2 s (no intro in v2: everything is usable from the first frame). */
function useBoard(reduced: boolean) {
  const [index, setIndex] = useState(0)
  const [time, setTime] = useState('09:40')
  useEffect(() => {
    if (site.destinations.length < 2) return
    const id = setInterval(() => {
      if (document.hidden) return
      setIndex((i) => (i + 1) % site.destinations.length)
      setTime(randomTime())
    }, CITY_MS)
    return () => clearInterval(id)
  }, [])
  return { text: site.destinations[index]?.city ?? '', time, index, animate: !reduced }
}

export default function App() {
  const reduced = useReducedMotion()
  const board = useBoard(reduced)
  const [chooser, setChooser] = useState<{ anchor: HTMLElement | null; variant: ChooserVariant } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)
  const { lang, t } = useI18n()
  const sound = useSound()

  const showToast = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])
  const closeChooser = useCallback(() => setChooser(null), [])
  const openChooser = useCallback((el: HTMLElement) => setChooser((cur) => (cur ? null : { anchor: el, variant: 'default' })), [])

  // Easter egg «catch the paper plane» (docs/07). The module reads these through refs at launch time.
  const live = useRef({ t, soundOn: sound.on, chooserOpen: false })
  live.current = { t, soundOn: sound.on, chooserOpen: !!chooser }
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('egg')
    let egg: PlaneEggHandle | null = null
    let cancelled = false
    void import('./egg').then(({ initPlaneEgg }) => {
      if (cancelled) return
      egg = initPlaneEgg({
        firstDelayMs: q === 'now' ? 500 : 7000,
        onCatch: () => setChooser({ anchor: null, variant: 'egg' }),
        isBlocked: () => live.current.chooserOpen || !!document.querySelector('[aria-modal="true"]'),
        soundEnabled: () => live.current.soundOn,
        getAudioContext: sharedAudioContext,
        avoid: () => [document.querySelector('.pass'), document.getElementById('main-cta'), document.querySelector('.sticky-cta.is-shown .cta-sticky')],
        onFlyby: ({ soundOn }) => {
          if (soundOn) return
          // one hint, nothing else: the sound button pulses twice with a lime ring
          const btn = document.querySelector('.sound-btn')
          btn?.classList.remove('is-pulse')
          void (btn as HTMLElement | null)?.offsetWidth
          btn?.classList.add('is-pulse')
        },
        labels: () => ({ catchAria: live.current.t.egg.catch_aria, stamp: live.current.t.egg.stamp }),
      })
      if (import.meta.env.DEV || q) (window as unknown as { __egg?: PlaneEggHandle }).__egg = egg
    })
    return () => {
      cancelled = true
      egg?.destroy()
    }
  }, [])

  return (
    <div className="page" data-lang={lang}>
      <Grain />
      <Globe active={board.index} className="page-globe" />
      <div className="shell">
        <TopBar />
        <main className="main">
          <section className="area-hero">
            <Hero />
          </section>
          <section className="area-board">
            <DepartureBoard text={board.text} time={board.time} animate={board.animate} />
          </section>
          <aside className="area-pass">
            <BoardingPass onChoose={openChooser} choosing={!!chooser} onToast={showToast} />
          </aside>
          <section className="area-stamps">
            <Stamps />
          </section>
        </main>
        <Footer />
      </div>
      <StickyCta onChoose={openChooser} />
      <Chooser open={!!chooser} anchor={chooser?.anchor ?? null} variant={chooser?.variant} onClose={closeChooser} />
      <Toast message={toast} />
    </div>
  )
}
