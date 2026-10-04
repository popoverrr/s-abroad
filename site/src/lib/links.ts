import type { MouseEvent } from 'react'
import type { Dict } from '../i18n'
import { digits, formatPhone, isEmpty, isTodo, site, type Manager } from './site'

export const fill = (s: string, name: string) => s.replaceAll('{name}', name)

export type ResolvedManager = {
  id: string
  name: string
  initial: string
  phoneLabel: string
  wa: { href: string; todo: boolean }
  tel: { href: string; todo: boolean } | null
}

function managerName(t: Dict, m: Manager) {
  const key = m.nameKey.split('.')[1] as keyof Dict['managers']
  return t.managers[key] ?? m.id
}

/** `template` — WhatsApp message with {name}; defaults to wa.default (the easter egg passes egg.wa). */
export function managers(t: Dict, template: string = t.wa.default): ResolvedManager[] {
  return site.managers
    .filter((m) => !(isEmpty(m.whatsapp) && isEmpty(m.phone)))
    .map((m) => {
      const name = managerName(t, m)
      const waNum = isEmpty(m.whatsapp) ? m.phone : m.whatsapp
      const wa = isTodo(waNum)
        ? { href: '#todo', todo: true }
        : { href: `https://wa.me/${digits(waNum)}?text=${encodeURIComponent(fill(template, name))}`, todo: false }
      const tel = isEmpty(m.phone) ? null : isTodo(m.phone) ? { href: '#todo', todo: true } : { href: `tel:+${digits(m.phone)}`, todo: false }
      return { id: m.id, name, initial: m.initial || name[0], phoneLabel: isTodo(m.phone) || isEmpty(m.phone) ? '' : formatPhone(m.phone), wa, tel }
    })
}

const stop = (e: MouseEvent) => e.preventDefault()
const desktop = () => window.matchMedia('(min-width: 768px) and (hover: hover)').matches

/** Props for an <a>. WhatsApp opens a new tab on desktop only; TODO links get data-todo and do nothing. */
export function anchorProps(l: { href: string; todo: boolean }, opts: { external?: boolean } = {}) {
  const ext = opts.external ?? (l.href.startsWith('https://wa.me') ? desktop() : l.href.startsWith('http'))
  return {
    href: l.href,
    ...(l.todo ? { 'data-todo': '', onClick: stop } : {}),
    ...(ext && !l.todo ? { target: '_blank', rel: 'noopener' } : {}),
  }
}
