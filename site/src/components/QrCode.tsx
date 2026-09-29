import { useMemo } from 'react'
import QR from 'qrcode'
import { Mark } from './Mark'

/** QR as crisp SVG with rounded modules, rounded finder eyes and a quiet centre for the mark (level H). */
export function QrCode({ value, size, className = '', withMark = true }: { value: string; size: number | string; className?: string; withMark?: boolean }) {
  const { n, path, eyes } = useMemo(() => {
    const qr = QR.create(value, { errorCorrectionLevel: 'H' })
    const n = qr.modules.size
    const data = qr.modules.data
    const isEye = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
    const hole = Math.ceil(n * 0.22) | 1
    const h0 = (n - hole) / 2
    const inHole = (x: number, y: number) => withMark && x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole
    let path = ''
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (!data[y * n + x] || isEye(x, y) || inHole(x, y)) continue
        path += `M${x + 0.1} ${y + 0.5}a.4.4 0 1 0 .8 0a.4.4 0 1 0-.8 0`
      }
    const eyes = [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]
    return { n, path, eyes }
  }, [value, withMark])

  return (
    <span className={`qr ${className}`} style={{ width: size, height: size }} data-qr={value}>
      <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width="100%" height="100%" role="img" aria-label={value} shapeRendering="geometricPrecision">
        <path d={path} fill="currentColor" />
        {eyes.map(([x, y]) => (
          <g key={`${x}-${y}`} fill="none" stroke="currentColor">
            <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="1.8" strokeWidth="1" />
            <rect x={x + 2} y={y + 2} width="3" height="3" rx=".9" fill="currentColor" stroke="none" />
          </g>
        ))}
      </svg>
      {withMark && <Mark className="qr-mark" size={0} />}
    </span>
  )
}
