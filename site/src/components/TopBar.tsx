import { useEffect, useRef, useState } from 'react'
import { LANGS, LANG_LABEL, useI18n, type Lang } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { Mark } from './Mark'
import { site } from '../lib/site'

function LangSwitch() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const pick = (l: Lang) => {
    setLang(l)
    setOpen(false)
  }

  return (
    <>
      {/* Desktop / tablet: four buttons */}
      <div className="langs langs--row" role="group" aria-label={t.lang.label}>
        {LANGS.map((l) => (
          <button key={l} type="button" lang={l} aria-pressed={l === lang} className="lang-btn" onClick={() => pick(l)}>
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
      {/* Mobile: current code, tap to open */}
      <div className="langs langs--menu" ref={ref}>
        <button
          type="button"
          className="lang-current"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={`${t.lang.label}: ${LANG_LABEL[lang]}`}
          onClick={() => setOpen((v) => !v)}
        >
          {LANG_LABEL[lang]}
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        {open && (
          <div className="lang-pop" role="group" aria-label={t.lang.label}>
            {LANGS.map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={l === lang} className="lang-btn" onClick={() => pick(l)}>
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function SoundButton() {
  const { on, toggle } = useSound()
  const { t } = useI18n()
  const label = on ? t.sound.on : t.sound.off
  return (
    <button type="button" className={`sound-btn ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={label} onClick={toggle}>
      <span className="eq" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sound-label t-fade">{label}</span>
    </button>
  )
}

export function TopBar() {
  const { t } = useI18n()
  return (
    <header className="topbar">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label={site.brand}>
        <Mark size={30} />
        <span className="brand-text">
          <b>{site.brand}</b>
          <small className="t-fade">{t.brand.tagline}</small>
        </span>
      </a>
      <div className="tools">
        <LangSwitch />
        <SoundButton />
      </div>
    </header>
  )
}
