// The brand mark. A real logo put into assets/ (logo.svg / logo.png) is synced to src/assets/mark.* and wins.
const svgs = import.meta.glob('../assets/mark.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const pngs = import.meta.glob('../assets/mark.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const svg = Object.values(svgs)[0]
const png = Object.values(pngs)[0]

export const markUrl = png

export function Mark({ size = 28, className = '' }: { size?: number; className?: string }) {
  if (png) return <img src={png} width={size} height={size} alt="" aria-hidden="true" className={className} />
  return (
    <span
      aria-hidden="true"
      className={`mark ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg ?? '' }}
    />
  )
}
