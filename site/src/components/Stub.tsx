import { lazy, Suspense, useMemo } from 'react'
import { useI18n } from '../i18n'
import { site, siteUrl } from '../lib/site'
import { downloadVCard } from '../lib/vcard'
import { share } from '../lib/share'
import { useMedia } from '../lib/motion'

// QR is shown on ≥ 768 px only — load the generator lazily so phones never download it.
const QrCode = lazy(() => import('./QrCode').then((m) => ({ default: m.QrCode })))

/** Decorative barcode derived from the brand string — purely visual. */
function Barcode() {
  const bars = useMemo(() => {
    const src = `${site.brand}·${site.year}·SEAT01A`
    const out: { x: number; w: number }[] = []
    let x = 0
    for (let i = 0; i < src.length; i++) {
      const c = src.charCodeAt(i)
      for (let b = 0; b < 4; b++) {
        const w = 1 + ((c >> b) & 1) + ((c >> (b + 3)) & 1)
        out.push({ x, w })
        x += w + 1 + ((c >> (b + 1)) & 1)
      }
    }
    return { out, total: x }
  }, [])
  return (
    <svg className="barcode" viewBox={`0 0 ${bars.total} 20`} preserveAspectRatio="none" aria-hidden="true">
      {bars.out.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="20" />
      ))}
    </svg>
  )
}

function IconSave() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 16.5c.9-2.9 3.3-4.5 6.2-4.5 1.2 0 2.3.3 3.2.8M15.5 12.5v5M13 15h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M10 12.5V3M6.5 6.2 10 2.8l3.5 3.4M6 9H4.8A1.3 1.3 0 0 0 3.5 10.3v5.4A1.3 1.3 0 0 0 4.8 17h10.4a1.3 1.3 0 0 0 1.3-1.3v-5.4A1.3 1.3 0 0 0 15.2 9H14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Stub({ onToast }: { onToast: (m: string) => void }) {
  const { t, lang } = useI18n()
  const wide = useMedia('(min-width: 768px)')
  const onShare = async () => {
    if ((await share(t, lang)) === 'copied') onToast(t.stub.copied)
  }
  return (
    <div className="stub">
      <div className="stub-main">
        <div className="stub-qr">
          {wide && (
            <Suspense fallback={<span className="qr" style={{ width: 104, height: 104 }} />}>
              <QrCode value={siteUrl()} size={104} />
            </Suspense>
          )}
        </div>
        <div className="stub-side">
          <p className="stub-scan">{t.stub.scan}</p>
          <div className="stub-actions">
            <button type="button" className="pill" onClick={() => downloadVCard(t)}>
              <IconSave />
              <span>{t.stub.save_contact}</span>
            </button>
            <button type="button" className="pill" onClick={onShare}>
              <IconShare />
              <span>{t.stub.share}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="stub-foot" aria-hidden="true">
        <Barcode />
        <span className="mono">S-ABROAD · {site.year} · SEAT 01A</span>
      </div>
    </div>
  )
}
