import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import ru from '../content/i18n/ru.json'
import kk from '../content/i18n/kk.json'
import en from '../content/i18n/en.json'
import cs from '../content/i18n/cs.json'

export type Dict = typeof ru
export const LANGS = ['ru', 'kk', 'en', 'cs'] as const
export type Lang = (typeof LANGS)[number]
export const LANG_LABEL: Record<Lang, string> = { ru: 'RU', kk: 'KZ', en: 'EN', cs: 'CZ' }
export const OG_LOCALE: Record<Lang, string> = { ru: 'ru_RU', kk: 'kk_KZ', en: 'en_US', cs: 'cs_CZ' }

// `satisfies` makes tsc fail when a translation misses a key present in ru.json.
const DICTS = { ru, kk, en, cs } satisfies Record<Lang, Dict>
const STORE = 'sa-lang'

const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v)

function detect(): Lang {
  const q = new URLSearchParams(location.search).get('lang')
  if (isLang(q)) return q
  try {
    const s = localStorage.getItem(STORE)
    if (isLang(s)) return s
  } catch {
    /* storage blocked */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.toLowerCase()
    if (c.startsWith('kk')) return 'kk'
    if (c.startsWith('cs') || c.startsWith('sk')) return 'cs'
    if (c.startsWith('en')) return 'en'
    if (c.startsWith('ru') || c.startsWith('uk')) return 'ru'
  }
  return 'ru'
}

function setMeta(sel: string, value: string) {
  document.querySelector(sel)?.setAttribute('content', value)
}

function applyDocument(lang: Lang) {
  const d = DICTS[lang]
  document.documentElement.lang = lang
  document.title = d.meta.title
  setMeta('meta[name="description"]', d.meta.description)
  setMeta('meta[property="og:title"]', d.meta.title)
  setMeta('meta[property="og:description"]', d.meta.description)
  setMeta('meta[property="og:locale"]', OG_LOCALE[lang])
  setMeta('meta[name="twitter:title"]', d.meta.title)
  setMeta('meta[name="twitter:description"]', d.meta.description)
}

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void }
const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect)

  useEffect(() => applyDocument(lang), [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORE, l)
    } catch {
      /* storage blocked */
    }
    const url = new URL(location.href)
    url.searchParams.set('lang', l)
    history.replaceState(null, '', url)
    // Short crossfade of translatable text: restart the CSS animation.
    const html = document.documentElement
    html.classList.remove('lang-anim')
    void html.offsetWidth
    html.classList.add('lang-anim')
  }, [])

  const value = useMemo(() => ({ lang, t: DICTS[lang] as Dict, setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useI18n outside provider')
  return c
}

export const useT = () => useI18n().t
