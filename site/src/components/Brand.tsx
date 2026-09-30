// Client logo from assets/brand (synced to src/assets/brand), inlined so it stays crisp and takes currentColor.
import markS from '../assets/brand/mark-s.svg?raw'
import wordmark from '../assets/brand/wordmark-abroad.svg?raw'

function Svg({ src, className, style }: { src: string; className: string; style?: React.CSSProperties }) {
  return <span aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: src }} />
}

export function MarkS({ size = 28, className = '' }: { size?: number; className?: string }) {
  return <Svg src={markS} className={`brand-svg mark-s ${className}`} style={{ height: size || undefined }} />
}

export function Wordmark({ height = 14, className = '' }: { height?: number; className?: string }) {
  return <Svg src={wordmark} className={`brand-svg wordmark ${className}`} style={{ height }} />
}

/** mark-s + ABROAD in one line — header lockup. */
export function Logo({ mark = 28, word = 14 }: { mark?: number; word?: number }) {
  return (
    <span className="logo">
      <MarkS size={mark} />
      <Wordmark height={word} />
    </span>
  )
}
