// Named imports only: Vite tree-shakes the rest of site.json (notes, colors) out of the bundle.
import { brand, domain, year, managers, socials, origin, destinations } from '../content/site.json'

export type Place = { code: string; city: string; lat: number; lng: number }
export type Manager = { id: string; nameKey: string; phone: string; whatsapp: string; initial: string; photo?: string }
export type Social = { id: 'instagram' | 'tiktok' | 'threads'; label: string; url: string; handle: string }

export const site = { brand, domain, year, managers, socials, origin, destinations } as unknown as {
  brand: string
  domain: string
  year: number
  managers: Manager[]
  socials: Social[]
  origin: Place
  destinations: Place[]
}

/** "" → hidden, "TODO…" → placeholder shown with href="#todo". */
export const isTodo = (v: string | undefined) => !!v && v.trim().startsWith('TODO')
export const isEmpty = (v: string | undefined) => !v || !v.trim()
export const usable = (v: string | undefined): v is string => !isEmpty(v) && !isTodo(v)
export const digits = (v: string) => v.replace(/\D/g, '')

/** Public URL of the site: the configured domain, or the current origin while the domain is TODO. */
export function siteUrl(): string {
  if (usable(site.domain)) {
    const d = site.domain.trim().replace(/\/+$/, '')
    return /^https?:\/\//.test(d) ? d + '/' : `https://${d}/`
  }
  return location.origin + import.meta.env.BASE_URL
}

/** 77075858747 → +7 707 585 87 47 (KZ/RU), otherwise +<digits> grouped by 3. */
export function formatPhone(v: string): string {
  const d = digits(v)
  if (d.length === 11 && d.startsWith('7')) return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
  return '+' + d.replace(/(\d{3})(?=\d)/g, '$1 ')
}

/** Social URLs without tracking parameters. */
export const cleanUrl = (u: string) => u.split(/[?#]/)[0]

if (import.meta.env.DEV) {
  const todo: string[] = []
  if (isTodo(site.domain)) todo.push('domain')
  site.managers.forEach((m) => (isTodo(m.phone) || isTodo(m.whatsapp)) && todo.push(`managers.${m.id}`))
  if (todo.length) console.warn('[S ABROAD] Заполните content/site.json:', todo.join(', '))
}
