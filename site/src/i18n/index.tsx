import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import ru from '../content/i18n/ru.json'
import kk from '../content/i18n/kk.json'
import en from '../content/i18n/en.json'

export type Dict = typeof ru
// Order = header and language gate order: RU · EN · KZ
export const LANGS = ['ru', 'en', 'kk'] as const
export type Lang = (typeof LANGS)[number]
export const LANG_LABEL: Record<Lang, string> = { ru: 'RU', en: 'EN', kk: 'KZ' }
export const OG_LOCALE: Record<Lang, string> = { ru: 'ru_RU', en: 'en_US', kk: 'kk_KZ' }

// `satisfies` makes tsc fail when a translation misses a key present in ru.json.
const DICTS = { ru, en, kk } satisfies Record<Lang, Dict>
const STORE = 'sa-lang'

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v)

/** Explicit ?lang=ru|en|kk in the address (direct links, tests) — the only case that skips the language gate. */
export function urlLang(): Lang | null {
  const q = new URLSearchParams(location.search).get('lang')
  return isLang(q) ? q : null
}

/** Language saved by an earlier visit (old "cs" and anything invalid → null). */
export function savedLang(): Lang | null {
  try {
    const s = localStorage.getItem(STORE)
    return isLang(s) ? s : null
  } catch {
    return null
  }
}

/** Best guess from the browser: kk* → kk, en* → en, everything else → ru. */
export function guessLang(): Lang {
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.toLowerCase()
    if (c.startsWith('kk')) return 'kk'
    if (c.startsWith('en')) return 'en'
    if (c.startsWith('ru')) return 'ru'
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

type Ctx = {
  lang: Lang
  t: Dict
  /** true when ?lang= is in the address; otherwise the language gate is shown on every load (v6) */
  chosen: boolean
  setLang: (l: Lang) => void
}
const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  // Decided synchronously before the first render, so the site never flashes before the gate.
  const [initial] = useState(() => urlLang())
  const [lang, setLangState] = useState<Lang>(() => initial ?? savedLang() ?? guessLang())
  const [chosen, setChosen] = useState(initial !== null)

  useEffect(() => applyDocument(lang), [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setChosen(true)
    applyDocument(l)
    try {
      localStorage.setItem(STORE, l)
    } catch {
      /* storage blocked */
    }
    // v6: the language lives in localStorage only. A ?lang= in the address would hide the gate on reload
    // (and with it the click that unlocks sound), so drop it once the visitor switches language.
    const url = new URL(location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang')
      history.replaceState(history.state, '', url)
    }
    // Short crossfade of translatable text: restart the CSS animation.
    const html = document.documentElement
    html.classList.remove('lang-anim')
    void html.offsetWidth
    html.classList.add('lang-anim')
  }, [])

  const value = useMemo(() => ({ lang, t: DICTS[lang] as Dict, chosen, setLang }), [lang, chosen, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useI18n outside provider')
  return c
}

export const useT = () => useI18n().t
