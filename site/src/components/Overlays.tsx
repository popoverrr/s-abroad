import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m as motion } from 'motion/react'
import { useI18n } from '../i18n'
import { WaIcon } from './Icons'

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

/** Mobile sticky CTA: shown only while the main WhatsApp button is out of view; opens the same chooser. */
export function StickyCta({ onChoose }: { onChoose: (el: HTMLElement) => void }) {
  const { t } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const target = document.getElementById('main-cta')
    if (!target) return
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 })
    io.observe(target)
    return () => io.disconnect()
  }, [])

  return (
    <div className={`sticky-cta ${show ? 'is-shown' : ''}`} aria-hidden={!show}>
      <button type="button" className="cta-sticky" tabIndex={show ? 0 : -1} aria-haspopup="dialog" onClick={(e) => onChoose(e.currentTarget)}>
        <WaIcon size={22} />
        <span>{t.cta.primary}</span>
      </button>
    </div>
  )
}
