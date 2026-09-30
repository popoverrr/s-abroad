import { LANGS, LANG_LABEL, useI18n } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { Logo } from './Brand'
import { site } from '../lib/site'

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
  const { t, lang, setLang } = useI18n()
  return (
    <header className="topbar">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label={site.brand}>
        <Logo />
        <small className="brand-tagline t-fade">{t.brand.tagline}</small>
      </a>
      <div className="tools">
        {/* All four languages are always visible: one tap to switch. */}
        <div className="langs" role="group" aria-label={t.lang.label}>
          {LANGS.map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={l === lang} className="lang-btn" onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <SoundButton />
      </div>
    </header>
  )
}
