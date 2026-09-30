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
import { Chooser } from './components/Chooser'

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
  const [chooser, setChooser] = useState<HTMLElement | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)
  const { lang } = useI18n()

  const showToast = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])
  const closeChooser = useCallback(() => setChooser(null), [])
  const openChooser = useCallback((el: HTMLElement) => setChooser((cur) => (cur ? null : el)), [])

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
      <Chooser anchor={chooser} onClose={closeChooser} />
      <Toast message={toast} />
    </div>
  )
}
