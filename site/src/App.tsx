import { useCallback, useEffect, useRef, useState } from 'react'
import { site } from './lib/site'
import { shouldPlayIntro, useReducedMotion } from './lib/motion'
import { useI18n } from './i18n'
import { TopBar } from './components/TopBar'
import { Hero } from './components/Hero'
import { DepartureBoard } from './components/DepartureBoard'
import { Globe } from './components/Globe'
import { BoardingPass } from './components/BoardingPass'
import { Stamps } from './components/Stamps'
import { Footer, Grain } from './components/Footer'
import { QrModal, StickyCta, Toast } from './components/Overlays'

const INTRO_MS = 1700
const CITY_MS = 3200

function randomTime() {
  // 06:00–23:55, five-minute steps
  const m = 6 * 60 + Math.floor(Math.random() * ((23 * 60 + 55 - 6 * 60) / 5 + 1)) * 5
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Board text: during the intro it spells the brand, then cycles destinations every 3.2 s. */
function useBoard(intro: boolean, reduced: boolean) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'blank' | 'brand' | 'city'>(intro ? 'blank' : 'city')
  const [time, setTime] = useState('09:40')

  useEffect(() => {
    if (!intro) return
    const a = setTimeout(() => setPhase('brand'), 30)
    const b = setTimeout(() => {
      setPhase('city')
      setTime(randomTime())
    }, 1050)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [intro])

  useEffect(() => {
    if (phase !== 'city' || site.destinations.length < 2) return
    const id = setInterval(() => {
      if (document.hidden) return
      setIndex((i) => (i + 1) % site.destinations.length)
      setTime(randomTime())
    }, CITY_MS)
    return () => clearInterval(id)
  }, [phase])

  const text = phase === 'blank' ? '' : phase === 'brand' ? site.brand : site.destinations[index]?.city ?? ''
  return { text, time, index, animate: !reduced }
}

export default function App() {
  const reduced = useReducedMotion()
  const [intro, setIntro] = useState(shouldPlayIntro)
  const board = useBoard(intro, reduced)
  const [qr, setQr] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)
  const { lang } = useI18n()

  useEffect(() => {
    if (!intro) return
    const id = setTimeout(() => setIntro(false), INTRO_MS)
    const skip = () => setIntro(false)
    window.addEventListener('pointerdown', skip, { once: true })
    window.addEventListener('keydown', skip, { once: true })
    return () => {
      clearTimeout(id)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [intro])

  const showToast = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])
  const closeQr = useCallback(() => setQr(false), [])

  return (
    <div className={`page ${intro ? 'is-intro' : ''}`} data-lang={lang}>
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
            <BoardingPass onShowQr={() => setQr(true)} onToast={showToast} />
          </aside>
          <section className="area-stamps">
            <Stamps intro={intro} />
          </section>
        </main>
        <Footer />
      </div>
      <StickyCta />
      <QrModal open={qr} onClose={closeQr} />
      <Toast message={toast} />
    </div>
  )
}
