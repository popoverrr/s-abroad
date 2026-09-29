// Screenshots per docs/04-acceptance.md: 5 widths × RU/KK (first screen + full page),
// plus m390 with the QR modal and d1280 with hover on the second gate. Also checks layout invariants.
// Usage: npm run build && npm run shots   (LANGS=ru,kk,en,cs  SIZES=m390,d1280 to narrow down)
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'screenshots')
mkdirSync(out, { recursive: true })

const SIZES = {
  m360: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['Pixel 5'].userAgent },
  m390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent },
  t768: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPad Mini'].userAgent },
  d1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  d1920: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
}
const langs = (process.env.LANGS ?? 'ru,kk').split(',')
const sizes = (process.env.SIZES ?? Object.keys(SIZES).join(',')).split(',')

const { url, close } = await serve()
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const problems = []

for (const lang of langs) {
  for (const name of sizes) {
    const ctx = await browser.newContext({ ...SIZES[name], locale: lang === 'kk' ? 'kk-KZ' : 'ru-RU' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(`${url}/?lang=${lang}&intro=1`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2600) // intro ≤ 1.6 s + globe fade
    const file = (s) => join(out, `${lang}-${name}${s}.png`)
    await page.screenshot({ path: file('') })

    const m = await page.evaluate(() => {
      const pass = document.querySelector('.pass')?.getBoundingClientRect()
      const row = document.querySelector('.board-row')
      const board = document.querySelector('.board')?.getBoundingClientRect()
      const slogan = [...document.querySelectorAll('.slogan .line-in')].map((l) => l.getBoundingClientRect().right)
      return {
        scrollW: document.documentElement.scrollWidth,
        innerW: innerWidth,
        scrollH: document.documentElement.scrollHeight,
        innerH: innerHeight,
        passBottom: pass?.bottom ?? 0,
        boardOneLine: row ? row.scrollWidth <= row.clientWidth + 1 : false,
        boardRight: board?.right ?? 0,
        sloganRight: Math.max(...slogan),
      }
    })
    if (m.scrollW > m.innerW) problems.push(`${lang}-${name}: horizontal scroll ${m.scrollW} > ${m.innerW}`)
    if (!m.boardOneLine || m.boardRight > m.innerW) problems.push(`${lang}-${name}: departure board overflows`)
    if (m.sloganRight > m.innerW) problems.push(`${lang}-${name}: slogan overflows (${Math.round(m.sloganRight)})`)
    if (name.startsWith('d') && (m.scrollH > m.innerH || m.passBottom > m.innerH))
      problems.push(`${lang}-${name}: desktop must fit one screen (scrollH ${m.scrollH}, pass bottom ${Math.round(m.passBottom)})`)

    for (let y = 0; y < m.scrollH; y += 300) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(60) }
    await page.waitForTimeout(1200)
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: file('-full'), fullPage: true })

    if (name === 'm390') {
      await page.evaluate(() => scrollTo(0, 0))
      await page.locator('.show-qr').click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: file('-qr') })
      await page.keyboard.press('Escape')
    }
    if (name === 'd1280') {
      await page.locator('.gate').nth(1).hover()
      await page.waitForTimeout(450)
      await page.screenshot({ path: file('-hover') })
    }
    if (errors.length) problems.push(`${lang}-${name}: console errors: ${errors.join(' | ')}`)
    console.log(`[shots] ${lang}-${name}`)
    await ctx.close()
  }
}

await browser.close()
await close()
if (problems.length) {
  console.log('\n⚠ Проблемы:')
  for (const p of problems) console.log('  • ' + p)
  process.exitCode = 1
} else console.log('\n✓ Раскладка: без горизонтального скролла, табло в одну строку, десктоп — один экран')
