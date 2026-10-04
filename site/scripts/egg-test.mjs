// Easter egg acceptance (docs/07-easter-egg-v4.md § «Приёмка v4») + frame series screenshots/egg-*.png.
// Usage: npm run build && node scripts/egg-test.mjs        (BASE_URL=https://s-abroad.asia to test production)
import { chromium, devices } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'screenshots')
mkdirSync(out, { recursive: true })
const i18n = (l) => JSON.parse(readFileSync(join(root, 'src', 'content', 'i18n', `${l}.json`), 'utf8'))

const VIEWS = {
  d1280: { viewport: { width: 1280, height: 800 } },
  m390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent },
  m360: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['Pixel 5'].userAgent },
}

const { url, close } = await serve()
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const res = []
const ok = (name, cond, extra = '') => res.push(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)

async function open(view, query, extra = {}) {
  const ctx = await browser.newContext({ ...VIEWS[view], ignoreHTTPSErrors: true, ...extra })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${url}/?${query}`, { waitUntil: 'load' })
  return { ctx, page, errors }
}

/** Watch every frame: max overlap of plane boxes with the pass and the main CTA. */
const WATCH = () => {
  window.__eggHit = { pass: 0, cta: 0, frames: 0, seen: 0 }
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  const loop = () => {
    const planes = [...document.querySelectorAll('.egg-plane:not(.egg-plane--parked)')]
    const pass = document.querySelector('.pass')?.getBoundingClientRect()
    const cta = document.getElementById('main-cta')?.getBoundingClientRect()
    window.__eggHit.frames++
    if (planes.length) window.__eggHit.seen++
    for (const p of planes) {
      // the svg is the visible plane; the button box is bigger than the drawing
      const r = p.querySelector('.egg-plane-body')?.getBoundingClientRect() ?? p.getBoundingClientRect()
      if (pass) window.__eggHit.pass = Math.max(window.__eggHit.pass, area(r, pass))
      if (cta) window.__eggHit.cta = Math.max(window.__eggHit.cta, area(r, cta))
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

// 1. Timing without ?egg=now: nothing at 6 s, three planes by 8 s
{
  const { ctx, page } = await open('d1280', 'lang=ru&nogl')
  await page.waitForTimeout(6000)
  const at6 = await page.locator('.egg-plane').count()
  await page.waitForTimeout(2000)
  const at8 = await page.locator('.egg-plane').count()
  ok('вылет: на 6-й секунде самолётиков нет, к 8-й их 3', at6 === 0 && at8 === 3, `6 с: ${at6}, 8 с: ${at8}`)
  await ctx.close()
}

// 2. No overlap with the pass / main CTA during a full pass; 3. nodes cleaned up; frame series
for (const view of ['d1280', 'm390', 'm360']) {
  // nogl: headless software WebGL runs the page at ~10 fps, which slows the flight (frame step is capped at 50 ms)
  const { ctx, page, errors } = await open(view, 'lang=ru&egg=now&nogl')
  await page.evaluate(WATCH)
  await page.waitForSelector('.egg-plane', { timeout: 5000 })
  const t0 = Date.now()
  if (view !== 'm360') {
    for (const at of [800, 1600, 2600, 3600]) {
      await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)))
      await page.screenshot({ path: join(out, `egg-${view}-${at}.png`) })
    }
  }
  await page.waitForTimeout(Math.max(0, 8000 - (Date.now() - t0)))
  const hit = await page.evaluate(() => window.__eggHit)
  const left = await page.locator('.egg-plane, .egg-dash, .egg-bit, .egg-stamp').count()
  ok(`${view}: пролёт не задевает талон и кнопку WhatsApp`, hit.pass === 0 && hit.cta === 0, `макс. пересечение: талон ${Math.round(hit.pass)} px², кнопка ${Math.round(hit.cta)} px², кадров с самолётиками ${hit.seen}`)
  ok(`${view}: через 8 с после вылета узлов пасхалки нет`, left === 0, `${left}`)
  ok(`${view}: консоль без ошибок`, !errors.length, errors.join(' | '))
  await ctx.close()
}

// 4. Catch on 4 languages: dialog in egg mode, egg.wa in both links, stamp fits
for (const [lang, view] of [
  ['ru', 'd1280'],
  ['ru', 'm390'],
  ['kk', 'm360'],
  ['en', 'd1280'],
  ['cs', 'm390'],
]) {
  const t = i18n(lang).egg
  const { ctx, page, errors } = await open(view, `lang=${lang}&egg=now`)
  await page.waitForSelector('.egg-plane--white', { timeout: 5000 })
  await page.waitForTimeout(1300)
  const box = await page.locator('.egg-plane--white').boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(300)
  const stamp = await page.evaluate(() => {
    const s = document.querySelector('.egg-stamp')?.getBoundingClientRect()
    const tx = document.querySelector('.egg-stamp-text')
    if (!s || !tx) return null
    const r = tx.getBoundingClientRect()
    return { fits: tx.scrollWidth <= tx.clientWidth + 1 && r.left >= s.left + 4 && r.right <= s.right - 4, text: tx.textContent }
  })
  if (lang !== 'ru' || view === 'd1280') await page.screenshot({ path: join(out, `egg-${lang}-${view}-catch.png`) })
  const t1 = Date.now()
  await page.waitForSelector('.chooser--egg', { timeout: 1200 }).catch(() => null)
  const opened = (await page.locator('.chooser--egg').count()) === 1
  ok(`${lang} ${view}: поимка → диалог пасхалки за ≤ 1,2 с`, opened, `${Date.now() - t1 + 300} мс после клика`)
  ok(`${lang} ${view}: штамп «${stamp?.text}» помещается в круг`, !!stamp?.fits)
  if (opened) {
    await page.waitForTimeout(250)
    const d = await page.evaluate(() => ({
      badge: document.querySelector('.egg-badge')?.textContent?.trim(),
      badgeLines: (() => {
        const b = document.querySelector('.egg-badge')
        return b ? (b.getBoundingClientRect().height < 40 ? 1 : 2) : 0
      })(),
      title: document.querySelector('#chooser-title')?.textContent,
      sub: document.querySelector('.chooser-sub')?.textContent,
      picks: [...document.querySelectorAll('.chooser .pick')].map((a) => [a.getAttribute('href'), a.querySelector('b')?.textContent]),
      centred: (() => {
        const b = document.querySelector('.chooser-box')?.getBoundingClientRect()
        return b ? Math.abs(b.left + b.width / 2 - innerWidth / 2) < 2 && Math.abs(b.top + b.height / 2 - innerHeight / 2) < 2 : false
      })(),
    }))
    ok(`${lang} ${view}: бейдж, заголовок, подзаголовок пасхалки`, d.badge === t.badge && d.title === t.title && d.sub === t.sub)
    ok(`${lang} ${view}: бейдж в одну строку`, d.badgeLines <= 1, `${d.badgeLines}`)
    const waOk = d.picks.length === 2 && d.picks.every(([h, name]) => h.startsWith('https://wa.me/') && decodeURIComponent(h.split('text=')[1]) === t.wa.replaceAll('{name}', name))
    ok(`${lang} ${view}: обе ссылки wa.me с текстом egg.wa и именем`, waOk)
    if (view === 'd1280') ok(`${lang} ${view}: на десктопе диалог по центру экрана`, d.centred)
    await page.screenshot({ path: join(out, `egg-${lang}-${view}-dialog.png`) })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(2500)
    ok(`${lang} ${view}: после закрытия самолётики больше не летят`, (await page.locator('.egg-plane').count()) === 0)
  }
  ok(`${lang} ${view}: консоль без ошибок`, !errors.length, errors.join(' | '))
  await ctx.close()
}

// 5. Chooser open via the main button → no launch; after closing → launch
{
  const { ctx, page } = await open('d1280', 'lang=ru&nogl')
  await page.waitForTimeout(800)
  await page.locator('#main-cta').click()
  await page.waitForTimeout(9000)
  const during = await page.locator('.egg-plane').count()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(2600)
  const after = await page.locator('.egg-plane').count()
  ok('при открытом выборе менеджера не вылетают, после закрытия — вылетают', during === 0 && after === 3, `открыт: ${during}, после: ${after}`)
  await ctx.close()
}

// 6. Reduced motion: parked plane, click opens the egg dialog
{
  const { ctx, page } = await open('m390', 'lang=ru&egg=now', { reducedMotion: 'reduce' })
  await page.waitForTimeout(1500)
  const flying = await page.locator('.egg-plane:not(.egg-plane--parked)').count()
  const parked = await page.locator('.egg-plane--parked').count()
  await page.screenshot({ path: join(out, 'egg-reduced-m390.png') })
  if (parked) await page.locator('.egg-plane--parked').click()
  await page.waitForTimeout(1200)
  ok('reduced motion: летающих нет, есть неподвижный, клик открывает диалог', flying === 0 && parked === 1 && (await page.locator('.chooser--egg').count()) === 1, `летят ${flying}, стоит ${parked}`)
  await ctx.close()
}

await browser.close()
await close()
console.log(res.join('\n'))
if (res.some((l) => l.startsWith('✗'))) process.exitCode = 1
