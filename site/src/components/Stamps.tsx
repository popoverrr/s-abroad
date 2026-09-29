import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { waHref } from '../lib/links'
import { anchorProps } from '../lib/links'
import { prefersReducedMotion, seeded } from '../lib/motion'

const R = 50 // ring text radius in a 132 viewBox
const CIRC = 2 * Math.PI * R

const ICONS = [
  // graduation cap
  'M4 10.5 16 5l12 5.5-12 5.5-12-5.5ZM9 13v6c2 2 4.5 3 7 3s5-1 7-3v-6M28 10.5V17',
  // speech bubble
  'M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v8a3.5 3.5 0 0 1-3.5 3.5H15l-5.5 4.5V20H9.5A3.5 3.5 0 0 1 6 16.5ZM11 11h10M11 15h6',
  // suitcase + sun
  'M7 13h18v11H7ZM12 13v-2.5A1.5 1.5 0 0 1 13.5 9h5a1.5 1.5 0 0 1 1.5 1.5V13M12 13v11M20 13v11M25 4.5a2.5 2.5 0 1 1 0 .01M25 1v1M29 5h-1M22 5h-1',
  // passport
  'M9 4h13a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9ZM9 4v24M16.5 12.5a3.5 3.5 0 1 0 .01 0M13 12.5h7M16.5 9c1.2 1 1.2 6 0 7M16.5 9c-1.2 1-1.2 6 0 7M13 21h7',
]

function StampSvg({ i, ring, title }: { i: number; ring: string; title: string }) {
  const id = `ink-${i}`
  const reps = Math.max(1, Math.round(CIRC / (ring.length * 7.4)))
  const text = Array.from({ length: reps }, () => ring).join(' ')
  const fs = Math.min(10, CIRC / (text.length * 0.7))
  const tfs = Math.min(12, 78 / (title.length * 0.66))
  return (
    <svg viewBox="0 0 132 132" className="stamp-svg" aria-hidden="true">
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={i + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed={i + 11} result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 2.9" result="mask" />
          <feComposite in="d" in2="mask" operator="in" />
        </filter>
        <path id={`${id}-p`} d={`M66 ${66 - R}a${R} ${R} 0 1 1-.01 0`} />
      </defs>
      <g filter={`url(#${id})`} fill="currentColor" stroke="currentColor">
        <circle cx="66" cy="66" r="63" fill="none" strokeWidth="2.6" />
        <circle cx="66" cy="66" r="58.5" fill="none" strokeWidth="1" />
        <circle cx="66" cy="66" r="41" fill="none" strokeWidth="1.2" />
        <text className="stamp-ring" fontSize={fs} stroke="none">
          <textPath href={`#${id}-p`} textLength={CIRC - 2} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
        <path d={ICONS[i % ICONS.length]} transform="translate(50 36)" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="66" y="84" textAnchor="middle" className="stamp-title" fontSize={tfs} stroke="none">
          {title.toUpperCase()}
        </text>
      </g>
    </svg>
  )
}

export function Stamps({ intro }: { intro: boolean }) {
  const { t } = useI18n()
  const { stamp } = useSound()
  const ref = useRef<HTMLDivElement>(null)
  // 'static' = already visible without animation, 'wait' = hidden until in view, 'go' = stamping
  const [state, setState] = useState<'static' | 'wait' | 'go'>(() => (prefersReducedMotion() ? 'static' : 'wait'))

  useEffect(() => {
    if (state !== 'wait') return
    const el = ref.current!
    const r = el.getBoundingClientRect()
    const inViewNow = r.top < innerHeight && r.bottom > 0
    if (inViewNow && !intro) {
      setState('static')
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setState('go')
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [state, intro])

  // Thuds in sync with the CSS stamping (base delay + 140 ms each, impact at ~45 % of the animation).
  useEffect(() => {
    if (state !== 'go') return
    const base = intro ? 900 : 0
    const timers = t.services.map((_, i) => window.setTimeout(stamp, base + i * 140 + 150))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <div className={`stamps stamps--${state} ${intro ? 'stamps--intro' : ''}`} ref={ref}>
      {t.services.map((s, i) => {
        const rot = Math.round(seeded(i + 1) * 24 - 12)
        const wa = waHref(s.wa)
        return (
          <a
            key={i}
            {...anchorProps({ ...wa, external: false })}
            className={`stamp stamp--${i % 2 ? 'blue' : 'orange'}`}
            style={{ ['--rot' as string]: `${rot}deg`, ['--i' as string]: i }}
            aria-label={`${s.title}. ${s.text}`}
            onPointerEnter={(e) => e.pointerType === 'mouse' && e.currentTarget.classList.add('is-hover')}
            onPointerLeave={(e) => e.currentTarget.classList.remove('is-hover')}
          >
            <span className="stamp-inner">
              <StampSvg i={i} ring={s.ring} title={s.title} />
            </span>
            <span className="stamp-tip t-fade" aria-hidden="true">
              {s.text}
            </span>
          </a>
        )
      })}
    </div>
  )
}
