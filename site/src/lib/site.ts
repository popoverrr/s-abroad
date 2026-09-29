import raw from '../content/site.json'

export type LinkType = 'whatsapp' | 'instagram' | 'phone' | 'telegram' | 'email'
export type SiteLink = {
  id: string
  type: LinkType
  labelKey: string
  handle?: string
  primary?: boolean
  enabled?: boolean
}
export type Place = { code: string; city: string; lat: number; lng: number }

export const site = raw as unknown as {
  brand: string
  domain: string
  year: number
  contacts: Record<'whatsapp' | 'phone' | 'telegram' | 'email' | 'instagram', string>
  links: SiteLink[]
  origin: Place
  destinations: Place[]
}

/** "" → hidden, "TODO…" → placeholder shown with href="#todo". */
export const isTodo = (v: string | undefined) => !!v && v.trim().startsWith('TODO')
export const isEmpty = (v: string | undefined) => !v || !v.trim()
export const digits = (v: string) => v.replace(/\D/g, '')

/** Public URL of the site: the configured domain, or the current origin while the domain is TODO. */
export function siteUrl(): string {
  if (!isTodo(site.domain) && !isEmpty(site.domain)) {
    const d = site.domain.trim().replace(/\/+$/, '')
    return /^https?:\/\//.test(d) ? d + '/' : `https://${d}/`
  }
  return location.origin + import.meta.env.BASE_URL
}

export function siteHost(): string {
  return siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** 77010000000 → +7 701 000 00 00 (KZ/RU), otherwise +<digits> grouped by 3. */
export function formatPhone(v: string): string {
  const d = digits(v)
  if (d.length === 11 && d.startsWith('7')) return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
  return '+' + d.replace(/(\d{3})(?=\d)/g, '$1 ')
}

if (import.meta.env.DEV) {
  const todo: string[] = []
  if (isTodo(site.domain)) todo.push('domain')
  for (const [k, v] of Object.entries(site.contacts)) if (isTodo(v)) todo.push(`contacts.${k}`)
  if (todo.length) console.warn('[S ABROAD] Заполните content/site.json:', todo.join(', '))
}
