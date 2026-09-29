import { useEffect, useRef, type PointerEvent as RPointerEvent } from 'react'
import { m, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useI18n } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { anchorProps, gateLinks, type ResolvedLink } from '../lib/links'
import { site } from '../lib/site'
import { useMedia, useReducedMotion } from '../lib/motion'
import { Mark } from './Mark'
import { Plane } from './DepartureBoard'
import { Stub } from './Stub'

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GateRow({ link, n, first }: { link: ResolvedLink; n: number; first: boolean }) {
  const { t } = useI18n()
  const { tick } = useSound()
  const arrowRef = useRef<HTMLSpanElement>(null)

  // Gentle magnet: the arrow leans towards the cursor (desktop only, via pointer type).
  const onMove = (e: RPointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse' || !arrowRef.current) return
    const r = arrowRef.current.getBoundingClientRect()
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 160))
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 60))
    arrowRef.current.style.setProperty('--mx', `${dx * 4}px`)
    arrowRef.current.style.setProperty('--my', `${dy * 3}px`)
  }
  const onLeave = () => {
    arrowRef.current?.style.setProperty('--mx', '0px')
    arrowRef.current?.style.setProperty('--my', '0px')
  }

  return (
    <li>
      <a
        {...anchorProps(link)}
        id={first ? 'gate-first' : undefined}
        className={`gate ${link.primary ? 'gate--primary' : ''}`}
        onPointerEnter={(e) => e.pointerType === 'mouse' && tick()}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <span className="gate-n">{String(n).padStart(2, '0')}</span>
        <span className="gate-text">
          <span className="gate-label t-fade">
            {link.label}
            {link.primary && <span className="badge">{t.badge.free}</span>}
          </span>
          {link.sub && <span className="gate-sub">{link.sub}</span>}
        </span>
        <span className="gate-arrow" ref={arrowRef}>
          <Arrow />
        </span>
      </a>
    </li>
  )
}

export function BoardingPass({ onShowQr, onToast }: { onShowQr: () => void; onToast: (m: string) => void }) {
  const { t } = useI18n()
  const links = gateLinks(t)
  const desktop = useMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
  const reduced = useReducedMotion()
  const tiltOn = desktop && !reduced

  const paperRef = useRef<HTMLDivElement>(null)
  const perfRef = useRef<HTMLDivElement>(null)

  // Perforation notches follow the dashed line wherever the layout puts it.
  useEffect(() => {
    const paper = paperRef.current
    const perf = perfRef.current
    if (!paper || !perf) return
    const set = () => paper.style.setProperty('--py', `${perf.offsetTop + perf.offsetHeight / 2}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(paper)
    return () => ro.disconnect()
  }, [])

  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const spring = { stiffness: 160, damping: 18, mass: 0.6 }
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), spring)
  const ry = useSpring(useTransform(mx, [0, 1], [-6, 6]), spring)

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!tiltOn) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    mx.set(x)
    my.set(y)
    paperRef.current?.style.setProperty('--gx', `${x * 100}%`)
    paperRef.current?.style.setProperty('--gy', `${y * 100}%`)
  }
  const onLeave = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <div className="pass-wrap" onPointerMove={onMove} onPointerLeave={onLeave}>
      <m.div className="pass-tilt" style={tiltOn ? { rotateX: rx, rotateY: ry } : undefined}>
        <div className="pass-shadow">
          <div className={`pass ${tiltOn ? 'has-glare' : ''}`} ref={paperRef}>
            <div className="pass-glare" aria-hidden="true" />
            <header className="pass-head">
              <span className="mono t-fade">{t.pass.title}</span>
              <span className="pass-brand">
                <Mark size={18} />
                {site.brand}
              </span>
            </header>

            <div className="route" aria-hidden="true">
              <div className="route-end">
                <b>{site.origin.code}</b>
                <small className="t-fade">{t.pass.from_city}</small>
              </div>
              <div className="route-line">
                <span className="route-dash" />
                <span className="route-plane">
                  <Plane />
                </span>
              </div>
              <div className="route-end route-end--to">
                <b>EUR</b>
                <small className="t-fade">{t.pass.to_city}</small>
              </div>
            </div>

            <dl className="pass-meta">
              <div>
                <dt className="t-fade">{t.pass.passenger}</dt>
                <dd className="t-fade">{t.pass.passenger_value}</dd>
              </div>
              <div>
                <dt className="t-fade">{t.pass.class}</dt>
                <dd className="t-fade">{t.pass.class_value}</dd>
              </div>
              <div>
                <dt className="t-fade">{t.pass.boarding}</dt>
                <dd className="t-fade">
                  <i className="dot" aria-hidden="true" />
                  {t.pass.boarding_value}
                </dd>
              </div>
            </dl>

            <nav className="gates" aria-label={t.pass.gates}>
              <p className="gates-title mono t-fade" aria-hidden="true">
                {t.pass.gates}
              </p>
              <ol>
                {links.map((l, i) => (
                  <GateRow key={l.id} link={l} n={i + 1} first={i === 0} />
                ))}
              </ol>
            </nav>

            <div className="perf" ref={perfRef} aria-hidden="true" />

            <Stub onShowQr={onShowQr} onToast={onToast} />
          </div>
        </div>
      </m.div>
    </div>
  )
}
