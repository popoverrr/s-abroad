import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import { anchorProps, managers } from '../lib/links'
import { useMedia } from '../lib/motion'
import { WaIcon } from './Icons'
import { Avatar } from './Avatar'
import planeWhite from '../egg/plane-white.svg?raw'

export type ChooserVariant = 'default' | 'egg'

/**
 * Manager picker for the main WhatsApp button.
 * Mobile: bottom sheet (swipe down / tap backdrop / Esc / Android back). Desktop: popover under (or above) the button.
 * variant 'egg' (paper-plane easter egg): own header and WhatsApp text; on desktop a centred modal instead of a popover.
 */
export function Chooser({ open, anchor, variant = 'default', onClose }: { open: boolean; anchor: HTMLElement | null; variant?: ChooserVariant; onClose: () => void }) {
  const { t } = useI18n()
  const sheet = !useMedia('(min-width: 768px)')
  const egg = variant === 'egg'
  const centred = egg && !sheet
  const boxRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)
  const closeRef = useRef(onClose)
  // After a pick the browser is leaving for WhatsApp — don't pop our history entry then.
  const leaving = useRef(false)
  closeRef.current = onClose

  // Android "back" closes the sheet: push a history entry while open.
  useEffect(() => {
    if (!open) return
    history.pushState({ chooser: true }, '')
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (history.state?.chooser && !leaving.current) history.back()
      leaving.current = false
    }
  }, [open])

  // Focus the first row, trap Tab, Esc closes.
  useEffect(() => {
    if (!open) return
    const back = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>('.pick')?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const f = boxRef.current?.querySelectorAll<HTMLElement>('a[href], button')
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
    document.addEventListener('keydown', onKey)
    if (sheet) document.documentElement.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('no-scroll')
      back?.focus?.()
    }
  }, [open, sheet])

  // Desktop popover: under the button, or above it when there is no room.
  useLayoutEffect(() => {
    if (!open || sheet || centred || !anchor) return setPos(null)
    const place = () => {
      const r = anchor.getBoundingClientRect()
      const h = boxRef.current?.offsetHeight ?? 220
      const below = r.bottom + 8 + h <= innerHeight - 8
      setPos({ left: r.left, width: r.width, top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - h) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, sheet, centred, anchor])

  useEffect(() => setDrag(0), [open])

  if (!open) return null

  const onDown = (e: RPE) => {
    dragStart.current = e.clientY
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: RPE) => dragStart.current !== null && setDrag(Math.max(0, e.clientY - dragStart.current))
  const onUp = () => {
    if (dragStart.current === null) return
    dragStart.current = null
    if (drag > 70) onClose()
    else setDrag(0)
  }

  const list = managers(t, egg ? t.egg.wa : t.wa.default)
  return createPortal(
    <div className={`chooser ${sheet ? 'chooser--sheet' : centred ? 'chooser--center' : 'chooser--pop'} ${egg ? 'chooser--egg' : ''}`}>
      <div className="chooser-backdrop" onClick={onClose} />
      <div
        className="chooser-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chooser-title"
        ref={boxRef}
        style={sheet ? { transform: drag ? `translateY(${drag}px)` : undefined } : centred ? undefined : pos ? { left: pos.left, top: pos.top, width: pos.width } : { visibility: 'hidden' }}
      >
        {sheet && (
          <div className="chooser-grip" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span />
          </div>
        )}
        <div className="chooser-head" onPointerDown={sheet ? onDown : undefined} onPointerMove={sheet ? onMove : undefined} onPointerUp={sheet ? onUp : undefined}>
          {egg && (
            <p className="egg-badge mono">
              <span className="egg-badge-plane" aria-hidden="true" dangerouslySetInnerHTML={{ __html: planeWhite }} />
              {t.egg.badge}
            </p>
          )}
          <p id="chooser-title" className="chooser-title">
            {egg ? t.egg.title : t.chooser.title}
          </p>
          <p className="chooser-sub">{egg ? t.egg.sub : t.chooser.sub}</p>
        </div>
        <ul className="chooser-list">
          {list.map((m) => (
            <li key={m.id}>
              <a {...anchorProps(m.wa)} className="pick" onClick={(e) => {
                  if (m.wa.todo) return e.preventDefault()
                  leaving.current = true
                  setTimeout(onClose, 50)
                }}>
                <Avatar id={m.id} photo={m.photo} initial={m.initial} name={m.name} size={64} lazy />
                <span className="pick-text">
                  <b>{m.name}</b>
                  {m.phoneLabel && <small>{m.phoneLabel}</small>}
                </span>
                <span className="pick-wa" aria-hidden="true">
                  <WaIcon size={22} />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <button type="button" className="chooser-close" onClick={onClose}>
          {t.chooser.close}
        </button>
      </div>
    </div>,
    document.body,
  )
}
