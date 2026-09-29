import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m as motion } from 'motion/react'
import { useI18n } from '../i18n'
import { siteHost, siteUrl } from '../lib/site'
import { waHref } from '../lib/links'
import { anchorProps } from '../lib/links'
import { QrCode } from './QrCode'

export function QrModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const back = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        // Focus trap: cycle inside the dialog.
        const f = boxRef.current?.querySelectorAll<HTMLElement>('button, a[href]')
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
    }
    document.addEventListener('keydown', onKey)
    document.documentElement.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('no-scroll')
      back?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="qr-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t.stub.show_qr}
          ref={boxRef}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div className="qr-modal-body" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <QrCode value={siteUrl()} size="min(70vmin, 420px)" className="qr-big" />
            <p className="qr-host">{siteHost()}</p>
          </motion.div>
          <button type="button" className="qr-close" ref={closeRef} onClick={onClose}>
            {t.stub.close}
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Toast({ message }: { message: string | null }) {
  return createPortal(
    <div className="toast-zone" role="status" aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z"
      />
    </svg>
  )
}

/** Mobile sticky CTA: shown while the first gate (the same consultation link) is out of view. */
export function StickyCta() {
  const { t } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const target = document.getElementById('gate-first')
    if (!target) return
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(target)
    return () => io.disconnect()
  }, [])

  const wa = waHref(t.wa.default)
  return (
    <div className={`sticky-cta ${show ? 'is-shown' : ''}`} aria-hidden={!show}>
      <a {...anchorProps({ ...wa, external: false })} className="cta-pill" tabIndex={show ? 0 : -1}>
        <WhatsAppIcon />
        <span className="t-fade">{t.cta.primary}</span>
      </a>
    </div>
  )
}
