// Screenshots per docs/04-acceptance.md + automated v2 acceptance (docs/05-revisions-v2.md § 10).
// Usage: npm run build && npm run shots     (LANGS=ru,kk  SIZES=m390,d1280 to narrow down; NOCOMPARE=1 skips v1 capture)
import { chromium, devices } from 'playwright'
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'screenshots')
mkdirSync(out, { recursive: true })

const phone = (w, h, ua) => ({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ua })
const SIZES = {
  m360: phone(360, 740, devices['Pixel 5'].userAgent),
  m390: phone(390, 844, devices['iPhone 13'].userAgent),
  t768: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPad Mini'].userAgent },
  d1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  d1920: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  // Instagram in-app browser windows
  ig360: phone(360, 640, devices['Pixel 5'].userAgent),
  ig390: phone(390, 664, devices['iPhone 13'].userAgent),
}
const langs = (process.env.LANGS ?? 'ru,kk').split(',')
const sizes = (process.env.SIZES ?? Object.keys(SIZES).join(',')).split(',')

const { url, close } = await serve()
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const problems = []
const metrics = {}
const fail = (m) => problems.push(m)

for (const lang of langs) {
  for (const name of sizes) {
    const ctx = await browser.newContext({ ...SIZES[name], ignoreHTTPSErrors: !!process.env.BASE_URL, locale: lang === 'kk' ? 'kk-KZ' : 'ru-RU' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(`${url}/?lang=${lang}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const id = `${lang}-${name}`
    const file = (s) => join(out, `${id}${s}.png`)
    await page.screenshot({ path: file('') })

    const m = await page.evaluate(() => {
      const r = (sel) => document.querySelector(sel)?.getBoundingClientRect()
      const all = (sel) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect())
      const lines = (el) => (el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : 0)
      return {
        scrollW: document.documentElement.scrollWidth,
        innerW: innerWidth,
        scrollH: document.documentElement.scrollHeight,
        innerH: innerHeight,
        cta: r('#main-cta'),
        managers: all('.manager'),
        socials: r('.socials ul'),
        boardOk: (() => {
          const row = document.querySelector('.board-row')
          return row ? row.scrollWidth <= row.clientWidth + 1 && row.getBoundingClientRect().right <= innerWidth : false
        })(),
        ctaLines: lines(document.querySelector('.cta-main-text b')),
        pillLines: Math.max(...[...document.querySelectorAll('.pill span, .social span')].map(lines)),
        namesCut: [...document.querySelectorAll('.manager-text b, .stamp-title')].some((e) => e.scrollWidth > e.clientWidth + 1),
      }
    })
    metrics[id] = { ctaBottom: Math.round(m.cta.bottom), scrollH: m.scrollH, innerH: m.innerH }

    if (m.scrollW > m.innerW) fail(`${id}: horizontal scroll ${m.scrollW} > ${m.innerW}`)
    if (!m.boardOk) fail(`${id}: departure board overflows`)
    if (name.startsWith('ig') && m.cta.bottom > m.innerH) fail(`${id}: WhatsApp button below the fold (bottom ${Math.round(m.cta.bottom)} > ${m.innerH})`)
    if (name === 'm390') {
      if (m.managers.some((b) => b.bottom > m.innerH) || m.socials.bottom > m.innerH) fail(`${id}: managers/socials not on the first screen`)
      if (m.scrollH > 1.6 * m.innerH) fail(`${id}: page too long ${m.scrollH} > 1.6 × ${m.innerH}`)
    }
    if (name.startsWith('d') && m.scrollH > m.innerH) fail(`${id}: desktop must fit one screen (scrollH ${m.scrollH})`)
    if (m.ctaLines > 2 || m.pillLines > 2) fail(`${id}: button text wraps into 3+ lines`)
    if (m.namesCut) fail(`${id}: names/titles are clipped`)

    if (!name.startsWith('ig')) await page.screenshot({ path: file('-full'), fullPage: true })

    // Chooser: 2 options, right numbers, name in the message
    if (name === 'm390' || name === 'd1280') {
      await page.evaluate(() => scrollTo(0, 0))
      await page.locator('#main-cta').click()
      await page.waitForTimeout(350)
      const picks = await page.$$eval('.chooser .pick', (a) => a.map((x) => x.getAttribute('href')))
      const names = await page.$$eval('.chooser .pick b', (a) => a.map((x) => x.textContent))
      if (picks.length !== 2) fail(`${id}: chooser has ${picks.length} options`)
      if (!picks[0]?.startsWith('https://wa.me/77075858747?text=') || !picks[1]?.startsWith('https://wa.me/77018009045?text=')) fail(`${id}: chooser links wrong: ${picks}`)
      picks.forEach((h, i) => !decodeURIComponent(h.split('text=')[1] ?? '').includes(names[i]) && fail(`${id}: WA message lacks manager name`))
      await page.screenshot({ path: file('-chooser') })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      if (await page.locator('.chooser').count()) fail(`${id}: Esc does not close chooser`)
    }

    // Direct manager links, socials, DOM bans
    const dom = await page.evaluate(() => ({
      wa: [...document.querySelectorAll('.manager .round--wa')].map((a) => a.getAttribute('href')),
      tel: [...document.querySelectorAll('.manager .round--tel')].map((a) => a.getAttribute('href')),
      socials: [...document.querySelectorAll('.socials a')].map((a) => a.getAttribute('href')),
      html: document.documentElement.outerHTML,
    }))
    if (dom.wa.length !== 2 || !dom.wa.every((h) => h.startsWith('https://wa.me/'))) fail(`${id}: manager WA links: ${dom.wa}`)
    if (dom.tel.length !== 2 || !dom.tel.every((h) => /^tel:\+\d+$/.test(h))) fail(`${id}: manager tel links: ${dom.tel}`)
    if (dom.socials.length !== 3 || dom.socials.some((h) => h.includes('?'))) fail(`${id}: socials: ${dom.socials}`)
    for (const bad of ['Украин', 'ukr', 'Telegram', '#FF5B24', '#ff5b24', 'feTurbulence', 'feDisplacementMap']) if (dom.html.includes(bad)) fail(`${id}: DOM contains "${bad}"`)

    if (name === 'd1280') {
      await page.locator('.manager').nth(1).hover()
      await page.waitForTimeout(400)
      await page.screenshot({ path: file('-hover') })
    }
    // Stamp zoom: DPR 3, one stamp cropped and upscaled 4× (nearest) — edges must be sharp
    if (name === 'm390' && lang === 'ru') {
      const box = await page.locator('.stamp-inner').first().boundingBox()
      await page.screenshot({ path: join(out, 'stamp-zoom-src.png'), clip: { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 } })
      const img = sharp(join(out, 'stamp-zoom-src.png'))
      const meta = await img.metadata()
      await img.resize(meta.width * 4, meta.height * 4, { kernel: 'nearest' }).toFile(join(out, 'stamp-zoom.png'))
    }
    if (name === 'd1920' && lang === 'ru') {
      const box = await page.locator('.stamp-inner').first().boundingBox()
      const ctx3 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 3, ignoreHTTPSErrors: !!process.env.BASE_URL })
      const p3 = await ctx3.newPage()
      await p3.goto(`${url}/?lang=ru`, { waitUntil: 'networkidle' })
      await p3.screenshot({ path: join(out, 'stamp-zoom-desktop-src.png'), clip: { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 } })
      const img = sharp(join(out, 'stamp-zoom-desktop-src.png'))
      const meta = await img.metadata()
      await img.resize(meta.width * 2, meta.height * 2, { kernel: 'nearest' }).toFile(join(out, 'stamp-zoom-desktop.png'))
      await ctx3.close()
    }
    if (errors.length) fail(`${id}: console errors: ${errors.join(' | ')}`)
    console.log(`[shots] ${id}`)
    await ctx.close()
  }
}

// Before/after at 390×664: v1 from the live site (captured once), v2 from this build.
if (!process.env.NOCOMPARE) {
  const v1 = join(out, 'v1-390.png')
  const ctx = await browser.newContext(SIZES.ig390)
  const page = await ctx.newPage()
  if (!existsSync(v1)) {
    try {
      await page.goto('https://popoverrr.github.io/s-abroad/?lang=ru&intro=0', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(1500)
      await page.screenshot({ path: v1 })
    } catch {
      console.log('[shots] v1 live site unavailable — compare skipped')
    }
  }
  await page.goto(`${url}/?lang=ru`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: join(out, 'v2-390.png') })
  await ctx.close()
  if (existsSync(v1)) {
    const a = await sharp(v1).metadata()
    const gap = 60
    await sharp({ create: { width: a.width * 2 + gap, height: a.height, channels: 3, background: '#ffffff' } })
      .composite([
        { input: v1, left: 0, top: 0 },
        { input: join(out, 'v2-390.png'), left: a.width + gap, top: 0 },
      ])
      .png()
      .toFile(join(out, 'compare-390.png'))
    console.log('[shots] compare-390.png (left v1, right v2)')
  }
}

await browser.close()
await close()
console.log('\nМетрики (низ кнопки WhatsApp / scrollHeight / высота окна):')
for (const [k, v] of Object.entries(metrics)) console.log(`  ${k.padEnd(10)} ${String(v.ctaBottom).padStart(5)} / ${String(v.scrollH).padStart(5)} / ${v.innerH}`)
if (problems.length) {
  console.log('\n⚠ Проблемы:')
  for (const p of problems) console.log('  • ' + p)
  process.exitCode = 1
} else console.log('\n✓ Приёмка v2 пройдена')
