import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { m, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useI18n } from '../i18n'
import { anchorProps, fill, managers } from '../lib/links'
import { cleanUrl, site } from '../lib/site'
import { useMedia, useReducedMotion } from '../lib/motion'
import { MarkS } from './Brand'
import { PhoneIcon, Plane, SOCIAL_ICON, WaIcon } from './Icons'
import { Stub } from './Stub'

function MiniRoute() {
  return (
    <span className="mini-route" aria-hidden="true">
      <b>{site.origin.code}</b>
      <span className="mini-line">
        <span className="route-plane">
          <Plane size={12} />
        </span>
      </span>
      <b>EUR</b>
    </span>
  )
}

function Managers() {
  const { t } = useI18n()
  return (
    <section className="managers" aria-labelledby="managers-title">
      <p id="managers-title" className="label mono">
        {t.managers.title}
      </p>
      <ul>
        {managers(t).map((mg) => (
          <li key={mg.id} className="manager">
            <span className="avatar" aria-hidden="true">
              {mg.initial}
            </span>
            <span className="manager-text">
              <b>{mg.name}</b>
              {mg.tel && mg.phoneLabel ? (
                <a {...anchorProps(mg.tel)} className="manager-phone">
                  {mg.phoneLabel}
                </a>
              ) : null}
            </span>
            <span className="manager-actions">
              <a {...anchorProps(mg.wa)} className="round round--wa" aria-label={fill(t.actions.wa_to, mg.name)}>
                <WaIcon size={20} />
              </a>
              {mg.tel && (
                <a {...anchorProps(mg.tel)} className="round round--tel" aria-label={fill(t.actions.call_to, mg.name)}>
                  <PhoneIcon size={18} />
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Socials() {
  const { t } = useI18n()
  return (
    <section className="socials" aria-labelledby="socials-title">
      <p id="socials-title" className="label mono">
        {t.socials.title}
      </p>
      <ul>
        {site.socials.map((s) => {
          const Icon = SOCIAL_ICON[s.id]
          return (
            <li key={s.id}>
              <a href={cleanUrl(s.url)} target="_blank" rel="noopener" className="social" aria-label={`${s.label} ${s.handle}`}>
                {Icon && <Icon size={18} />}
                <span>{s.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function BoardingPass({ onChoose, choosing, onToast }: { onChoose: (el: HTMLElement) => void; choosing: boolean; onToast: (m: string) => void }) {
  const { t } = useI18n()
  const desktop = useMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
  const reduced = useReducedMotion()
  const [overControl, setOverControl] = useState(false)
  const tiltOn = desktop && !reduced && !choosing && !overControl

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
  const rx = useSpring(useTransform(my, [0, 1], [5, -5]), spring)
  const ry = useSpring(useTransform(mx, [0, 1], [-5, 5]), spring)

  useEffect(() => {
    if (tiltOn) return
    mx.set(0.5)
    my.set(0.5)
  }, [tiltOn, mx, my])

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    // Targets must not slide away under the cursor: no tilt while over buttons/links.
    const control = !!(e.target as HTMLElement).closest('a, button')
    if (control !== overControl) setOverControl(control)
    if (!tiltOn || control) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    mx.set(x)
    my.set(y)
    paperRef.current?.style.setProperty('--gx', `${x * 100}%`)
    paperRef.current?.style.setProperty('--gy', `${y * 100}%`)
  }
  const onLeave = () => {
    setOverControl(false)
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <div className="pass-wrap" onPointerMove={onMove} onPointerLeave={onLeave}>
      <m.div className="pass-tilt" style={desktop && !reduced ? { rotateX: rx, rotateY: ry } : undefined}>
        <div className="pass-shadow">
          <div className={`pass ${desktop ? 'has-glare' : ''}`} ref={paperRef}>
            <div className="pass-glare" aria-hidden="true" />
            <header className="pass-head">
              <span className="mono pass-title">{t.pass.title}</span>
              <MiniRoute />
              <span className="pass-brand">
                <MarkS size={22} />
                <span className="mono">{site.brand}</span>
              </span>
            </header>

            {/* Desktop only: route block + one-line meta */}
            <div className="route" aria-hidden="true">
              <b>{site.origin.code}</b>
              <div className="route-line">
                <span className="route-dash" />
                <span className="route-plane">
                  <Plane />
                </span>
              </div>
              <b>EUR</b>
            </div>
            <p className="pass-meta mono">
              <span>
                {t.pass.passenger} — <b>{t.pass.passenger_value}</b>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.pass.class} — <b>{t.pass.class_value}</b>
              </span>
            </p>

            <button type="button" id="main-cta" className="cta-main" aria-haspopup="dialog" aria-expanded={choosing} onClick={(e) => onChoose(e.currentTarget)}>
              <WaIcon size={24} />
              <span className="cta-main-text">
                <b>{t.cta.primary}</b>
                <small>{t.cta.primary_sub}</small>
              </span>
            </button>

            <Managers />
            <Socials />

            <div className="perf" ref={perfRef} aria-hidden="true" />

            <Stub onToast={onToast} />
          </div>
        </div>
      </m.div>
    </div>
  )
}
