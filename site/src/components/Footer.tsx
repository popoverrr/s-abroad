import { useI18n } from '../i18n'
import { anchorProps, ukraineLink } from '../lib/links'
import { site } from '../lib/site'

export function Footer() {
  const { t } = useI18n()
  const ukr = ukraineLink(t)
  return (
    <footer className="footer">
      <span>
        {site.brand} · {site.year} · {t.footer.left}
      </span>
      {ukr && !ukr.todo && (
        <a {...anchorProps(ukr)} className="footer-ukr">
          <span className="t-fade">{t.footer.ukraine}</span>
          <span aria-hidden="true"> ↗</span>
        </a>
      )}
    </footer>
  )
}

export function Grain() {
  return (
    <svg className="grain" aria-hidden="true">
      <filter id="grain-f">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-f)" />
    </svg>
  )
}
