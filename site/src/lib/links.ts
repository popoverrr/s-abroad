import type { MouseEvent } from 'react'
import type { Dict } from '../i18n'
import { digits, formatPhone, isEmpty, isTodo, site, type SiteLink } from './site'

export type ResolvedLink = {
  id: string
  label: string
  sub: string
  href: string
  todo: boolean
  external: boolean
  primary: boolean
}

export function waHref(message: string): { href: string; todo: boolean } {
  const n = site.contacts.whatsapp
  if (isTodo(n) || isEmpty(n)) return { href: '#todo', todo: true }
  return { href: `https://wa.me/${digits(n)}?text=${encodeURIComponent(message)}`, todo: false }
}

function label(t: Dict, key: string): string {
  const [group, name] = key.split('.')
  const g = (t as unknown as Record<string, Record<string, string>>)[group]
  return g?.[name] ?? key
}

function resolve(link: SiteLink, t: Dict): ResolvedLink | null {
  const base = { id: link.id, label: label(t, link.labelKey), primary: !!link.primary }
  switch (link.type) {
    case 'whatsapp': {
      const v = site.contacts.whatsapp
      if (isEmpty(v)) return null
      const wa = waHref(t.wa.default)
      return { ...base, ...wa, sub: wa.todo ? 'WhatsApp' : `WhatsApp · ${formatPhone(v)}`, external: false }
    }
    case 'phone': {
      const v = site.contacts.phone
      if (isEmpty(v)) return null
      if (isTodo(v)) return { ...base, href: '#todo', todo: true, sub: '', external: false }
      return { ...base, href: `tel:+${digits(v)}`, todo: false, sub: formatPhone(v), external: false }
    }
    case 'instagram': {
      const h = (link.handle ?? site.contacts.instagram).replace(/^@/, '')
      if (isEmpty(h)) return null
      if (isTodo(h)) return { ...base, href: '#todo', todo: true, sub: 'Instagram', external: false }
      return { ...base, href: `https://www.instagram.com/${h}/`, todo: false, sub: `@${h}`, external: true }
    }
    case 'telegram': {
      const h = (link.handle ?? site.contacts.telegram).replace(/^@/, '')
      if (isEmpty(h)) return null
      if (isTodo(h)) return { ...base, href: '#todo', todo: true, sub: 'Telegram', external: false }
      return { ...base, href: `https://t.me/${h}`, todo: false, sub: `@${h}`, external: true }
    }
    case 'email': {
      const v = site.contacts.email
      if (isEmpty(v)) return null
      if (isTodo(v)) return { ...base, href: '#todo', todo: true, sub: '', external: false }
      return { ...base, href: `mailto:${v}`, todo: false, sub: v, external: false }
    }
  }
}

/** Visible gate rows in site.json order (the caller numbers them 01, 02…). */
export function gateLinks(t: Dict): ResolvedLink[] {
  return site.links
    .filter((l) => l.enabled !== false)
    .map((l) => resolve(l, t))
    .filter((l): l is ResolvedLink => l !== null)
}

export function ukraineLink(t: Dict): ResolvedLink | null {
  const l = site.links.find((x) => x.id === 'ukraine' && x.enabled !== false)
  return l ? resolve(l, t) : null
}

const stop = (e: MouseEvent) => e.preventDefault()

/** Props for an <a>: external links open in a new tab, WhatsApp/tel stay in place, TODO gets data-todo. */
export function anchorProps(l: { href: string; todo: boolean; external: boolean }) {
  return {
    href: l.href,
    ...(l.todo ? { 'data-todo': '', onClick: stop } : {}),
    ...(l.external ? { target: '_blank', rel: 'noopener' } : {}),
  }
}
