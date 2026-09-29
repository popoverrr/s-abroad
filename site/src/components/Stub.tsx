import { useMemo } from 'react'
import { useI18n } from '../i18n'
import { site, siteUrl } from '../lib/site'
import { downloadVCard } from '../lib/vcard'
import { share } from '../lib/share'
import { QrCode } from './QrCode'

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
function IconQr() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h2v2h-2zM15 15h2v2h-2zM15 12h2M12 16v1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function Stub({ onShowQr, onToast }: { onShowQr: () => void; onToast: (m: string) => void }) {
  const { t, lang } = useI18n()
  const url = siteUrl()

  const onShare = async () => {
    const r = await share(t, lang)
    if (r === 'copied') onToast(t.stub.copied)
  }

  return (
    <div className="stub">
      <div className="stub-main">
        <div className="stub-qr">
          <QrCode value={url} size={112} />
        </div>
        <div className="stub-side">
          <p className="stub-scan t-fade">{t.stub.scan}</p>
          <div className="stub-actions">
            <button type="button" className="pill" onClick={() => downloadVCard(t)}>
              <IconSave />
              <span className="t-fade">{t.stub.save_contact}</span>
            </button>
            <button type="button" className="pill" onClick={onShare}>
              <IconShare />
              <span className="t-fade">{t.stub.share}</span>
            </button>
          </div>
          <button type="button" className="show-qr" onClick={onShowQr}>
            <IconQr />
            <span className="t-fade">{t.stub.show_qr}</span>
          </button>
        </div>
      </div>
      <div className="stub-foot" aria-hidden="true">
        <Barcode />
        <span className="mono">
          S-ABROAD · {site.year} · SEAT 01A
        </span>
      </div>
    </div>
  )
}
