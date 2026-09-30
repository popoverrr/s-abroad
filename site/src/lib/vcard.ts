import type { Dict } from '../i18n'
import { cleanUrl, digits, site, siteUrl, usable } from './site'
import { managers } from './links'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** vCard 3.0: one card, both managers as labelled phones. TODO values are never included. */
export function buildVCard(t: Dict): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:;${esc(site.brand)};;;`, `FN:${esc(site.brand)}`, `ORG:${esc(site.brand)}`]
  let item = 1
  for (const m of site.managers) {
    if (!usable(m.phone)) continue
    const name = managers(t).find((x) => x.id === m.id)?.name ?? m.id
    lines.push(`item${item}.TEL;type=CELL:+${digits(m.phone)}`, `item${item}.X-ABLabel:${esc(name)}`)
    item++
  }
  if (usable(site.domain)) lines.push(`URL:${siteUrl()}`)
  for (const s of site.socials) lines.push(`X-SOCIALPROFILE;type=${s.id}:${cleanUrl(s.url)}`)
  lines.push(`NOTE:${esc(t.brand.tagline)}`, 'END:VCARD')
  return lines.join('\r\n') + '\r\n'
}

export function downloadVCard(t: Dict) {
  const blob = new Blob([buildVCard(t)], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'S-ABROAD.vcf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
