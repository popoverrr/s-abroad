import { useI18n } from '../i18n'
import { useMedia, seeded } from '../lib/motion'

// 32-unit line icons, drawn at scale 2 in a 200 viewBox (stroke 2.5 × 2 = 5 units).
const ICONS = [
  // graduation cap
  'M4 12 16 6.5 28 12 16 17.5ZM9 14.5v5.5c2 2 4.5 3 7 3s5-1 7-3v-5.5M28 12v6',
  // speech bubble
  'M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v8a3.5 3.5 0 0 1-3.5 3.5H15l-5.5 4.5V20H9.5A3.5 3.5 0 0 1 6 16.5ZM11 11h10M11 15h6',
  // suitcase
  'M6 12h20v13H6ZM12 12V9.5A1.5 1.5 0 0 1 13.5 8h5A1.5 1.5 0 0 1 20 9.5V12M12 12v13M20 12v13',
  // passport
  'M9 4h13a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9ZM9 4v24M16.5 10a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M13 22h7',
]

// Admission, Languages, Holidays, Visas
const STAMP_COLORS = ['lime', 'pink', 'orange', 'violet']

const R_TEXT = 70
const CIRC = 2 * Math.PI * R_TEXT

/** Crisp stamp: plain vector, no filters. Rotation lives inside the SVG; "ink wear" is a sharp-edged mask. */
function StampSvg({ i, ring, withRing }: { i: number; ring: string; withRing: boolean }) {
  const id = `st-${i}`
  const rot = Math.round(seeded(i + 1) * 20 - 10)
  // Repeat the ring text around the circle: TEXT • TEXT • …
  const unit = `${ring} • `
  // Fill the circle with natural spacing: repeat short rings, then size the font (≥ 18 units) to fit.
  const reps = Math.max(1, Math.round(CIRC / (unit.length * 20 * 0.66)))
  const text = unit.repeat(reps)
  const fs = Math.max(18, Math.min(24, CIRC / (text.length * 0.68)))
  const nicks = Array.from({ length: 8 }, (_, k) => {
    const a = seeded(i * 13 + k) * Math.PI * 2
    const r = 60 + seeded(i * 7 + k * 3) * 36
    return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r, s: 1.6 + seeded(k + i * 5) * 2.6 }
  })
  return (
    <svg viewBox="0 0 200 200" className="stamp-svg" aria-hidden="true" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
      <defs>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect width="200" height="200" fill="#fff" />
          {nicks.map((n, k) => (k % 3 === 0 ? <rect key={k} x={n.x - n.s * 1.6} y={n.y - 0.9} width={n.s * 3.2} height="1.8" rx=".9" fill="#000" transform={`rotate(${Math.round(n.x * 3)} ${n.x} ${n.y})`} /> : <circle key={k} cx={n.x} cy={n.y} r={n.s} fill="#000" />))}
        </mask>
        <path id={`${id}-p`} d={`M100 ${100 - R_TEXT}a${R_TEXT} ${R_TEXT} 0 1 1-.01 0`} />
      </defs>
      <g transform={`rotate(${rot} 100 100)`} mask={`url(#${id}-m)`} fill="currentColor" stroke="currentColor">
        {/* sticker: solid disc + ink edge (4) + thin inner ring (1.5) */}
        <circle className="stamp-disc" cx="100" cy="100" r="96" stroke="none" />
        <circle className="stamp-edge" cx="100" cy="100" r="96" fill="none" strokeWidth="4" />
        <circle cx="100" cy="100" r="86" fill="none" strokeWidth="1.5" />
        {withRing && (
          <>
            <circle cx="100" cy="100" r="60" fill="none" strokeWidth="1.5" />
            <text className="stamp-ring" fontSize={fs.toFixed(1)} letterSpacing="2" stroke="none">
              <textPath href={`#${id}-p`} textLength={CIRC - 4} lengthAdjust="spacing">
                {text}
              </textPath>
            </text>
          </>
        )}
        <path
          d={ICONS[i % ICONS.length]}
          transform={withRing ? 'translate(68 68) scale(2)' : 'translate(52 52) scale(3)'}
          fill="none"
          strokeWidth={withRing ? 2.5 : 5 / 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

/** Four service stamps in one row — a visual list, not links. */
export function Stamps() {
  const { t } = useI18n()
  const wide = useMedia('(min-width: 768px)')
  return (
    <ul className="stamps">
      {t.services.map((s, i) => (
        <li key={i} className={`stamp stamp--${STAMP_COLORS[i % STAMP_COLORS.length]}`}>
          <span className="stamp-inner">
            <StampSvg i={i} ring={s.ring.toUpperCase()} withRing={wide} />
          </span>
          <span className="stamp-title">{s.title}</span>
        </li>
      ))}
    </ul>
  )
}
