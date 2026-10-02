import { useI18n } from '../i18n'
import { site } from '../lib/site'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <span className="footer-left">
        {site.brand} · {site.year} · {t.footer.left}
      </span>
      <a className="credit" href="https://cybermove.asia" target="_blank" rel="noopener">
        Create by <b>Cyber Move Consulting</b>
        <span aria-hidden="true"> ↗</span>
      </a>
    </footer>
  )
}

/** Film grain as a CSS tile (no SVG filter in the DOM). */
export function Grain() {
  return <div className="grain" aria-hidden="true" />
}
