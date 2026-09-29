import type { Dict } from '../i18n'
import { digits, isEmpty, isTodo, site, siteUrl } from './site'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const ok = (v: string | undefined): v is string => !!v && !isEmpty(v) && !isTodo(v)

/** vCard 3.0. TODO values are never included. */
export function buildVCard(t: Dict): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:;${esc(site.brand)};;;`, `FN:${esc(site.brand)}`, `ORG:${esc(site.brand)}`]
  const phone = site.contacts.phone
  const wa = site.contacts.whatsapp
  if (ok(phone)) lines.push(`TEL;TYPE=CELL,VOICE:+${digits(phone)}`)
  if (ok(wa) && (!ok(phone) || digits(wa) !== digits(phone))) lines.push(`TEL;TYPE=CELL:+${digits(wa)}`)
  if (ok(site.contacts.email)) lines.push(`EMAIL;TYPE=INTERNET:${site.contacts.email}`)
  if (ok(site.domain)) lines.push(`URL:${siteUrl()}`)
  if (ok(site.contacts.instagram)) {
    const ig = `https://www.instagram.com/${site.contacts.instagram.replace(/^@/, '')}/`
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${ig}`)
    if (!ok(site.domain)) lines.push(`URL:${ig}`)
  }
  if (ok(site.contacts.telegram)) {
    lines.push(`X-SOCIALPROFILE;TYPE=telegram:https://t.me/${site.contacts.telegram.replace(/^@/, '')}`)
  }
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
