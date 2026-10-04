// v7 acceptance (docs/10-photos-credit-v7.md): manager photos + accent credit button; screenshots/v7-*.png.
// Usage: npm run build && node scripts/v7-test.mjs        (BASE_URL=https://s-abroad.asia for production)
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'screenshots')
mkdirSync(out, { recursive: true })
// credit as it was before v7 (Footer.tsx @ 97eb593) — must not change
const CREDIT = { href: 'https://cybermove.asia', text: 'Create by Cyber Move Consulting' }
const NAMES = { ru: ['Рамиль', 'Гайнель'], en: ['Ramil', 'Gainel'], kk: ['Рамиль', 'Гайнель'] }

const VIEWS = {
  d1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 },
  d1920: { viewport: { width: 1920, height: 1080 } },
  m390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent },
  ig390: { viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent },
  ig360: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['Pixel 5'].userAgent },
}
const { url, close } = await serve()
const browser = await chromium.launch()
const res = []
const ok = (name, cond, extra = '') => res.push(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)

async function open(view, lang = 'ru', setup) {
  const ctx = await browser.newContext({ ...VIEWS[view], ignoreHTTPSErrors: true })
  if (setup) await setup(ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${url}/?lang=${lang}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  return { ctx, page, errors }
}
const avatars = (page, scope) =>
  page.$$eval(`${scope} .avatar`, (els) =>
    els.map((a) => {
      const img = a.querySelector('img')
      const r = a.getBoundingClientRect()
      const s = getComputedStyle(a)
      return {
        alt: img?.alt ?? null,
        natural: img?.naturalWidth ?? 0,
        w: Math.round(r.width),
        round: s.borderTopLeftRadius === '50%' || parseFloat(s.borderTopLeftRadius) >= r.width / 2 - 1,
        hasWH: !!img && img.hasAttribute('width') && img.hasAttribute('height'),
        initialVisible: getComputedStyle(a.querySelector('.avatar-initial')).visibility !== 'hidden' && !img,
      }
    }),
  )

// 1. Photos in the pass (ru/en/kk), chooser (normal + egg), sizes
for (const [lang, view] of [
  ['ru', 'm390'],
  ['en', 'd1280'],
  ['kk', 'ig360'],
]) {
  const { ctx, page, errors } = await open(view, lang)
  const a = await avatars(page, '.managers')
  const sizeOk = a.every((x) => x.w >= 52 && x.w <= 56)
  ok(`${lang} ${view}: в талоне 2 фото, alt на языке, размер ${a.map((x) => x.w).join('/')}px, круглые`, a.length === 2 && a.every((x) => x.natural > 0 && x.round && x.hasWH) && a[0].alt === NAMES[lang][0] && a[1].alt === NAMES[lang][1] && sizeOk, JSON.stringify(a))
  if (lang === 'ru') await page.locator('.managers').screenshot({ path: join(out, `v7-pass-${view}.png`) })
  if (lang === 'en') await page.locator('.area-pass').screenshot({ path: join(out, `v7-pass-${view}.png`) })
  await page.locator('#main-cta').click()
  await page.waitForTimeout(700)
  const c = await avatars(page, '.chooser')
  ok(`${lang} ${view}: в выборе менеджера те же фото (64px)`, c.length === 2 && c.every((x) => x.natural > 0 && x.w === 64) && c[0].alt === NAMES[lang][0], JSON.stringify(c.map((x) => [x.alt, x.w, x.natural])))
  if (lang !== 'kk') await page.screenshot({ path: join(out, `v7-chooser-${view}.png`) })
  ok(`${lang} ${view}: консоль без ошибок`, !errors.length, errors.join(' | '))
  await ctx.close()
}
// egg chooser
{
  const ctx = await browser.newContext({ ...VIEWS.d1280, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await page.goto(`${url}/?lang=ru&egg=now&nogl`, { waitUntil: 'load' })
  await page.waitForSelector('.egg-plane--white', { timeout: 6000 })
  await page.waitForTimeout(1200)
  const b = await page.locator('.egg-plane--white').boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForSelector('.chooser--egg', { timeout: 2000 }).catch(() => null)
  await page.waitForTimeout(600)
  const c = await avatars(page, '.chooser--egg')
  ok('пасхалка: в диалоге «Самолёт пойман!» те же фото', c.length === 2 && c.every((x) => x.natural > 0) && c[0].alt === 'Рамиль', JSON.stringify(c.map((x) => [x.alt, x.natural])))
  await page.screenshot({ path: join(out, 'v7-chooser-egg-d1280.png') })
  await ctx.close()
}

// 2. Images blocked → initials, no layout shift
{
  const measure = (page) => page.$$eval('.manager', (m) => m.map((x) => Math.round(x.getBoundingClientRect().height)).join('/') + ' @' + Math.round(document.getElementById('main-cta').getBoundingClientRect().top))
  const a = await open('m390', 'ru')
  const withPhotos = await measure(a.page)
  await a.ctx.close()
  const b = await open('m390', 'ru', (ctx) => ctx.route(/\/assets\/(ramil|gainel)-.*\.(jpg|webp)/, (r) => r.abort()))
  const blocked = await measure(b.page)
  const letters = await b.page.$$eval('.managers .avatar', (els) => els.map((a) => (!a.querySelector('img') ? a.querySelector('.avatar-initial').textContent : '')))
  await b.page.locator('.managers').screenshot({ path: join(out, 'v7-fallback-m390.png') })
  ok('фото заблокированы → кружки с буквами, вёрстка не сдвинулась', letters.join('') === 'RG' && blocked === withPhotos, `${withPhotos} vs ${blocked}, буквы ${letters.join('')}`)
  await b.ctx.close()
}

// 3. CLS while photos load
{
  const ctx = await browser.newContext({ ...VIEWS.m390, ignoreHTTPSErrors: true })
  await ctx.route(/\/assets\/(ramil|gainel)-.*\.(jpg|webp)/, async (r) => {
    await new Promise((x) => setTimeout(x, 800))
    await r.continue()
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(`${url}/?lang=ru`, { waitUntil: 'domcontentloaded' })
  const before = await page.$eval('.manager', (m) => m.getBoundingClientRect().height)
  await page.waitForTimeout(2000)
  const after = await page.$eval('.manager', (m) => m.getBoundingClientRect().height)
  ok('загрузка фото не сдвигает вёрстку', before === after, `строка ${before} → ${after}px`)
  await ctx.close()
}

// 4. First-screen budget (v2) and no desktop scroll
for (const view of ['ig360', 'ig390', 'm390', 'd1280', 'd1920']) {
  const { ctx, page } = await open(view)
  const m = await page.evaluate(() => ({
    cta: document.getElementById('main-cta').getBoundingClientRect().bottom,
    managers: Math.max(...[...document.querySelectorAll('.manager')].map((x) => x.getBoundingClientRect().bottom)),
    socials: document.querySelector('.socials ul').getBoundingClientRect().bottom,
    scrollH: document.documentElement.scrollHeight,
    h: innerHeight,
  }))
  if (view.startsWith('ig')) ok(`${view}: главная кнопка WhatsApp на первом экране`, m.cta <= m.h, `низ ${Math.round(m.cta)} из ${m.h}`)
  if (view === 'm390') ok('m390: оба менеджера и соцсети без скролла, страница ≤ 1,6 экрана', m.managers <= m.h && m.socials <= m.h && m.scrollH <= 1.6 * m.h, `менеджеры ${Math.round(m.managers)}, соцсети ${Math.round(m.socials)}, высота ${m.scrollH}`)
  if (view.startsWith('d')) ok(`${view}: без скролла`, m.scrollH <= m.h, `${m.scrollH} / ${m.h}`)
  await ctx.close()
}

// 5. Credit: same href/text, ≥ 56px, fully visible at the bottom on mobile and not under the sticky CTA
for (const view of ['m390', 'ig360', 'd1280']) {
  const { ctx, page } = await open(view)
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(600)
  const c = await page.evaluate(() => {
    const a = document.querySelector('.credit')
    const r = a.getBoundingClientRect()
    const sticky = document.querySelector('.sticky-cta.is-shown')?.getBoundingClientRect()
    return {
      href: a.getAttribute('href'),
      target: a.target,
      text: a.textContent.replace(/[↗\s]+/g, ' ').replace('Create by', 'Create by ').replace(/\s+/g, ' ').trim(),
      aria: a.getAttribute('aria-label'),
      h: Math.round(r.height),
      inView: r.top >= 0 && r.bottom <= innerHeight,
      underSticky: sticky ? r.bottom > sticky.top + 1 : false,
    }
  })
  ok(`${view}: кредит — та же ссылка и текст, высота ${c.h}px`, c.href === CREDIT.href && c.target === '_blank' && c.text === CREDIT.text && c.aria === CREDIT.text && c.h >= 56, JSON.stringify(c))
  if (!view.startsWith('d')) ok(`${view}: кредит виден целиком внизу и не под sticky-кнопкой`, c.inView && !c.underSticky, JSON.stringify(c))
  if (view === 'm390') await page.screenshot({ path: join(out, 'v7-footer-m390.png') })
  if (view === 'd1280') {
    await page.locator('.footer').screenshot({ path: join(out, 'v7-credit-d1280.png') })
    await page.locator('.credit').hover()
    await page.waitForTimeout(300)
    await page.locator('.footer').screenshot({ path: join(out, 'v7-credit-hover-d1280.png') })
  }
  await ctx.close()
}

await browser.close()
await close()
console.log(res.join('\n'))
if (res.some((l) => l.startsWith('✗'))) process.exitCode = 1
