import { useI18n } from '../i18n'
import { site } from '../lib/site'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <span className="footer-left">
        {site.brand} · {site.year} · {t.footer.left}
      </span>
      {/* v7: same text and link, bigger accent pill */}
      <a className="credit" href="https://cybermove.asia" target="_blank" rel="noopener" aria-label="Create by Cyber Move Consulting">
        <span className="credit-text">
          <small>Create by</small>
          <b>Cyber Move Consulting</b>
        </span>
        <span className="credit-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16">
            <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </a>
    </footer>
  )
}

/** Film grain as a CSS tile (no SVG filter in the DOM). */
export function Grain() {
  return <div className="grain" aria-hidden="true" />
}
