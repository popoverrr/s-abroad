import { Fragment, useEffect, useRef, useState, type KeyboardEvent as RKE } from 'react'
import gate from '../content/gate.json'
import { guessLang, isLang, savedLang, useI18n, type Lang } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { holdUnlock } from '../audio/sound'
import { prefersReducedMotion, useMedia } from '../lib/motion'
import { Logo } from './Brand'
import { Plane } from './Icons'
import { SplitFlap } from './SplitFlap'

const BOARD = gate.board as string[]
const BOARD_LEN = Math.max(...BOARD.map((s) => s.length))
const LANGS = gate.languages.filter((l) => isLang(l.code)) as { code: Lang; label: string; name: string }[]
const CLOSE_MS = 450

/** v6: the gate is shown on EVERY load (the click unlocks sound); only ?og=1 and an explicit ?lang= skip it. ?gate=1 forces it. */
export function shouldShowGate(chosen: boolean): boolean {
  const q = new URLSearchParams(location.search)
  if (q.has('og')) return false
  if (q.get('gate') === '1') return true
  return !chosen
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Language gate (docs/08). One synchronous click handler: audio (iOS needs it inside the gesture) → language →
 * sound state → welcome chime → slide-up close → onDone (site timers start only then).
 */
export function Gate({ onDone }: { onDone: () => void }) {
  const { setLang } = useI18n()
  const sound = useSound()
  // the language from the previous visit is pre-selected; otherwise the browser's
  const [guess] = useState(() => savedLang() ?? guessLang())
  const [closing, setClosing] = useState(false)
  const [idx, setIdx] = useState(0)
  // focus ring only for keyboard users: the guessed button gets focus programmatically on load
  const [kbd, setKbd] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const narrow = !useMedia('(min-width: 400px)')
  const reduced = prefersReducedMotion()

  // Board: cycle the three "choose language" lines every 2.2 s.
  useEffect(() => {
    if (closing) return
    const id = setInterval(() => setIdx((i) => (i + 1) % BOARD.length), 2200)
    return () => clearInterval(id)
  }, [closing])

  // Initial focus on the guessed language.
  useEffect(() => {
    boxRef.current?.querySelector<HTMLButtonElement>(`[data-lang="${guess}"]`)?.focus({ preventScroll: true })
  }, [guess])

  const choose = (code: Lang) => {
    if (closing) return
    // 1–3. sound ON unconditionally: AudioContext created + resumed right here, inside the gesture (iOS), then the chime
    holdUnlock(false)
    sound.set(true, { chime: true })
    // 4. language
    setLang(code)
    // 5–7. close
    if (reduced) return onDone()
    setClosing(true)
    window.setTimeout(onDone, CLOSE_MS)
  }

  const onKey = (e: RKE<HTMLDivElement>) => {
    if (!kbd) setKbd(true)
    if (e.key === 'Escape') {
      e.preventDefault()
      choose(guess)
    }
    if (e.key !== 'Tab') return
    const f = boxRef.current?.querySelectorAll<HTMLElement>('button')
    if (!f?.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={`gate ${closing ? 'is-closing' : ''} ${kbd ? 'is-kbd' : ''}`} role="dialog" aria-modal="true" aria-label={gate.dialog_aria} ref={boxRef} onKeyDown={onKey}>
      <div className="gate-col">
        <span className="gate-logo">
          <Logo mark={34} word={17} />
        </span>
        <div className="board gate-board" aria-hidden="true">
          <div className="board-row">
            {!narrow && (
              <>
                <b className="board-from">ALMATY</b>
                <Plane className="board-plane" />
              </>
            )}
            <SplitFlap text={BOARD[idx]} length={BOARD_LEN} animate={!reduced} onTick={sound.click} />
          </div>
        </div>
        <p className="gate-caption mono">
          {/* wraps only between languages, never inside «Тілді таңдаңыз» */}
          {gate.caption.split(' · ').map((part, i) => (
            <Fragment key={i}>
              {i > 0 && ' · '}
              <span className="nowrap">{part}</span>
            </Fragment>
          ))}
        </p>
        <div className="gate-langs">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              data-lang={l.code}
              className={`gate-lang ${l.code === guess ? 'is-guess' : ''}`}
              onClick={() => choose(l.code)}
            >
              <span className="gate-code mono">{l.label}</span>
              <span className="gate-name">{l.name}</span>
              <span className="gate-arrow">
                <Arrow />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
