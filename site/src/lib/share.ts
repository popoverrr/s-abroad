import type { Dict } from '../i18n'
import { siteUrl } from './site'

/** Web Share API when available; otherwise copies the link (the caller shows the toast). */
export async function share(t: Dict, lang: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = new URL(siteUrl())
  if (lang !== 'ru') url.searchParams.set('lang', lang)
  const data = { title: t.meta.title, text: t.meta.description, url: url.toString() }
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(data.url)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = data.url
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  return 'copied'
}
