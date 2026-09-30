import { useI18n } from '../i18n'
import { site } from '../lib/site'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      {site.brand} · {site.year} · {t.footer.left}
    </footer>
  )
}

/** Film grain as a CSS tile (no SVG filter in the DOM). */
export function Grain() {
  return <div className="grain" aria-hidden="true" />
}
