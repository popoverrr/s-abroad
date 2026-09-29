import { useLayoutEffect, useRef } from 'react'
import { useI18n } from '../i18n'

/**
 * The slogan is fitted to its column: the widest line (after fonts load) decides the font size,
 * capped by the design clamp. Kazakh lines are longer than Russian — this keeps them on one line each.
 */
function useFitTitle(dep: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const h = ref.current
    if (!h) return
    const fit = () => {
      const lines = Array.from(h.querySelectorAll<HTMLElement>('.line-in'))
      const box = h.parentElement!.clientWidth
      h.classList.add('is-measuring') // font-size: 100px while measuring
      const widest = Math.max(...lines.map((l) => l.getBoundingClientRect().width))
      h.classList.remove('is-measuring')
      if (widest > 0) h.style.setProperty('--fit', `${Math.floor((100 * box * 0.98) / widest)}px`)
    }
    fit()
    void document.fonts?.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(h.parentElement!)
    return () => ro.disconnect()
  }, [dep])
  return ref
}

export function Hero() {
  const { t, lang } = useI18n()
  const lines = t.hero.title_lines
  const ref = useFitTitle(lang)
  return (
    <div className="hero">
      <p className="eyebrow t-fade">
        <span className="pulse" aria-hidden="true" />
        {t.hero.eyebrow}
      </p>
      <h1 className="slogan" ref={ref}>
        {lines.map((line, i) => {
          const last = i === lines.length - 1
          const dot = last && line.endsWith('.')
          return (
            <span className="line" key={i} style={{ ['--i' as string]: i }}>
              <span className="line-in t-fade">
                {dot ? line.slice(0, -1) : line}
                {dot && <span className="accent-dot">.</span>}
              </span>
            </span>
          )
        })}
      </h1>
      <p className="subtitle t-fade">
        {t.hero.subtitle.map((s, i) => (
          <span key={i}>
            {i > 0 && <span className="sep" aria-hidden="true"> · </span>}
            <span className="nowrap">{s}</span>
          </span>
        ))}
      </p>
    </div>
  )
}
