// v3 colour acceptance (docs/06-colors-v3.md § «Приёмка v3»). Run after `npm run build`.
import { chromium } from 'playwright'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const res = []
const ok = (name, cond, extra = '') => res.push(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)

// 1. No old v2 colours in the build (#195231 allowed only in icons/favicon)
const OLD = ['e4b96a', '8ed1a6', 'f3efe6', 'e4ddcd', '8fa097', '07120c', '0e1f16', '1a3326', '237045']
const walk = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    statSync(p).isDirectory() ? walk(p, out) : out.push(p)
  }
  return out
}
const hits = []
for (const f of walk(dist).filter((f) => /\.(css|js|html|svg|webmanifest|json)$/.test(f))) {
  const txt = readFileSync(f, 'utf8').toLowerCase()
  for (const c of OLD) if (txt.includes(c)) hits.push(`${relative(dist, f)}: ${c}`)
  if (txt.includes('195231') && !/favicon|pwa\//.test(relative(dist, f).replaceAll('\\', '/'))) hits.push(`${relative(dist, f)}: 195231`)
}
ok('в dist нет старых цветов v2', !hits.length, hits.join(', '))

// 2. WCAG contrast of the palette pairs
const hex = (h) => h.match(/\w\w/g).map((x) => parseInt(x, 16) / 255)
const lum = (h) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const P = { field: '00754a', field2: '00643f', ink: '0b0b0b', white: 'ffffff', on2: 'cfebdd', muted: '4a4a4a', lime: 'd2ff3a', pink: 'ff3d7f', orange: 'ff7a1a', violet: '6a4dff' }
const pairs = [
  ['белый на field', P.white, P.field, 5.7],
  ['on-field-2 на field-2', P.on2, P.field2, 5.7],
  ['on-field-2 на field', P.on2, P.field, 4.5],
  ['ink на lime', P.ink, P.lime, 16],
  ['ink на pink', P.ink, P.pink, 5.8],
  ['ink на orange', P.ink, P.orange, 7.5],
  ['белый на violet', P.white, P.violet, 5.1],
  ['paper-muted на белом', P.muted, P.white, 8.8],
  ['lime на ink (табло, toast)', P.lime, P.ink, 4.5],
  ['белый на ink (табло, звук)', P.white, P.ink, 4.5],
]
const table = []
for (const [name, fg, bg, min] of pairs) {
  const v = cr(fg, bg)
  table.push(`  ${name.padEnd(30)} ${v.toFixed(2).padStart(6)}:1  (норма ≥ ${min})`)
  ok(`контраст ${name}`, v >= min - 0.05, `${v.toFixed(2)}:1`)
}

// 3. Live checks in the browser
const { url, close } = await serve()
const browser = await chromium.launch()
for (const [vw, vh] of [
  [1280, 800],
  [390, 844],
]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } })
  await page.goto(`${url}/?lang=ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const r = await page.evaluate(() => {
    const cs = (sel) => (document.querySelector(sel) ? getComputedStyle(document.querySelector(sel)) : null)
    const page = cs('.page')
    const blurred = []
    for (const el of document.querySelectorAll('.stamp, .stamp *, .pass, .pass *, .cta-main, .cta-sticky, .round, .social, .pill, .pick, .chooser-box')) {
      const s = getComputedStyle(el)
      if (s.filter !== 'none') blurred.push(`${el.className}: filter`)
      if (s.backdropFilter && s.backdropFilter !== 'none') blurred.push(`${el.className}: backdrop`)
      // box-shadow "rgb(...) Xpx Ypx BLURpx SPREADpx" — blur must be 0
      for (const sh of s.boxShadow === 'none' ? [] : s.boxShadow.split(/,(?![^(]*\))/)) {
        const n = sh.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat)
        if ((n[2] ?? 0) > 0) blurred.push(`${String(el.className).slice(0, 30)}: shadow blur ${n[2]}`)
      }
    }
    // pink / orange / violet text or thin lines directly on the field (outside the pass / stamps / board)
    const spicy = ['rgb(255, 61, 127)', 'rgb(255, 122, 26)', 'rgb(106, 77, 255)']
    const onField = []
    for (const el of document.querySelectorAll('.topbar *, .hero *, .footer *, .stamp-title')) {
      const s = getComputedStyle(el)
      if (spicy.includes(s.color) && el.textContent.trim()) onField.push(el.className || el.tagName)
      if (spicy.includes(s.borderTopColor) && parseFloat(s.borderTopWidth) > 0) onField.push(el.className || el.tagName)
    }
    return {
      pageBg: page.backgroundImage + ' ' + page.backgroundColor,
      passBg: cs('.pass').backgroundColor,
      ctaBg: cs('.cta-main').backgroundColor,
      blurred,
      onField,
    }
  })
  const tag = `${vw}×${vh}`
  ok(`${tag}: фон страницы содержит rgb(0, 117, 74)`, r.pageBg.includes('rgb(0, 117, 74)'))
  ok(`${tag}: талон белый`, r.passBg === 'rgb(255, 255, 255)', r.passBg)
  ok(`${tag}: главная кнопка лаймовая`, r.ctaBg === 'rgb(210, 255, 58)', r.ctaBg)
  ok(`${tag}: нет фильтров и размытых теней`, !r.blurred.length, r.blurred.slice(0, 5).join('; '))
  ok(`${tag}: нет pink/orange/violet текста на поле`, !r.onField.length, r.onField.join(', '))
  await page.close()
}
await browser.close()
await close()

console.log('Контраст:\n' + table.join('\n') + '\n')
console.log(res.join('\n'))
if (res.some((l) => l.startsWith('✗'))) process.exitCode = 1
