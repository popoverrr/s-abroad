// Language gate + "sound always on" acceptance (docs/08 + docs/09 § «Приёмка v6») + screenshots/gate-v6-*.png.
// Usage: npm run build && node scripts/gate-test.mjs        (BASE_URL=https://s-abroad.asia to test production)
import { chromium, devices } from 'playwright'
import { readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'screenshots')
mkdirSync(out, { recursive: true })
const en = JSON.parse(readFileSync(join(root, 'src', 'content', 'i18n', 'en.json'), 'utf8'))

const VIEWS = {
  d1280: { viewport: { width: 1280, height: 800 } },
  m390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent },
  m360: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['Pixel 5'].userAgent },
}
const { url, close } = await serve()
const browser = await chromium.launch()
const res = []
const ok = (name, cond, extra = '') => res.push(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
const SWITCH_TEXTS = ['Звук · Sound', 'ЗВУК · SOUND', 'Sound on. Дыбыс', 'Sound off. Дыбыс']

async function open(view, query = '', extra = {}) {
  const ctx = await browser.newContext({ ...VIEWS[view], ignoreHTTPSErrors: true, locale: 'ru-RU', ...extra })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${url}/${query}`, { waitUntil: 'load' })
  return { ctx, page, errors }
}
const gateVisible = (page) => page.evaluate(() => !!document.querySelector('.gate:not(.is-closing)'))
const audio = (page) => page.evaluate(() => window.__audioState?.())
const closed = (page) => page.waitForSelector('.gate', { state: 'detached', timeout: 1500 }).catch(() => null)

// 1. No switch on the gate; fits and centred; screenshots
for (const view of ['m360', 'm390', 'd1280']) {
  const { ctx, page, errors } = await open(view)
  await page.waitForTimeout(800)
  const m = await page.evaluate((texts) => {
    const g = document.querySelector('.gate')
    const col = document.querySelector('.gate-col').getBoundingClientRect()
    const row = document.querySelector('.gate-board .board-row')
    return {
      switches: document.querySelectorAll('[role="switch"]').length,
      switchText: texts.some((t) => document.documentElement.outerHTML.includes(t)),
      scroll: g.scrollHeight > g.clientHeight + 1 || g.scrollWidth > g.clientWidth + 1,
      inside: col.top >= 0 && col.bottom <= innerHeight && col.left >= 0 && col.right <= innerWidth,
      centredY: Math.abs(col.top + col.height / 2 - innerHeight / 2) <= 2,
      centredX: Math.abs(col.left + col.width / 2 - innerWidth / 2) <= 2,
      oneLine: row.scrollWidth <= row.clientWidth + 1,
    }
  }, SWITCH_TEXTS)
  ok(`${view}: на экране языка нет свитча звука`, m.switches === 0 && !m.switchText)
  ok(`${view}: экран без скролла, блок по центру, табло в одну строку`, !m.scroll && m.inside && m.centredX && m.centredY && m.oneLine, JSON.stringify(m))
  ok(`${view}: консоль без ошибок`, !errors.length, errors.join(' | '))
  await page.screenshot({ path: join(out, `gate-v6-${view}.png`) })
  await ctx.close()
}

// 2. Click on each of the three buttons → sound enabled + running; no ?lang=; no sound key in storage
for (const code of ['ru', 'en', 'kk']) {
  const { ctx, page, errors } = await open('m390')
  await page.waitForTimeout(400)
  await page.locator(`.gate-lang[data-lang="${code}"]`).click()
  await closed(page)
  await page.waitForTimeout(150)
  const a = await audio(page)
  const s = await page.evaluate(() => ({ lang: document.documentElement.lang, q: location.search, keys: Object.keys(localStorage), cta: document.querySelector('.cta-main-text b')?.textContent }))
  ok(`клик «${code}»: звук enabled и running`, a?.enabled === true && a?.state === 'running', JSON.stringify(a))
  ok(`клик «${code}»: язык применён, ?lang= в адрес не дописан, ключа звука нет`, s.lang === code && !s.q.includes('lang=') && !s.keys.some((k) => /sound/i.test(k)), JSON.stringify(s))
  if (code === 'en') ok('клик «en»: тексты сайта на английском', s.cta === en.cta.primary)
  ok(`клик «${code}»: консоль без ошибок`, !errors.length, errors.join(' | '))
  await ctx.close()
}

// 3. Keyboard: Enter on a button, Esc → same result
{
  let { ctx, page } = await open('d1280')
  await page.waitForTimeout(300)
  await page.locator('.gate-lang[data-lang="kk"]').focus()
  await page.keyboard.press('Enter')
  await closed(page)
  let a = await audio(page)
  ok('Enter на кнопке: язык выбран, звук enabled и running', (await page.evaluate(() => document.documentElement.lang)) === 'kk' && a?.enabled && a?.state === 'running', JSON.stringify(a))
  await ctx.close()
  ;({ ctx, page } = await open('d1280', '', { locale: 'en-US' }))
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await closed(page)
  a = await audio(page)
  // Esc is not a user-activation key in browsers: the context exists but stays suspended until the next click/tap
  await page.mouse.click(600, 770)
  await page.waitForTimeout(200)
  const b = await audio(page)
  ok('Esc: предугаданный язык, звук enabled; running с первого клика (Esc браузер не считает жестом)', (await page.evaluate(() => document.documentElement.lang)) === 'en' && a?.enabled && b?.state === 'running', `после Esc ${a?.state}, после клика ${b?.state}`)
  await ctx.close()
}

// 4. Reload → gate again with the saved language pre-selected; header off → reload → on again
{
  const { ctx, page } = await open('d1280', '?nogl')
  await page.locator('.gate-lang[data-lang="en"]').click()
  await closed(page)
  await page.locator('.sound-btn').click()
  const off = await audio(page)
  ok('кнопка звука в шапке выключает: enabled false', off?.enabled === false, JSON.stringify(off))
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(300)
  const s = await page.evaluate(() => ({ gate: !!document.querySelector('.gate'), pre: document.querySelector('.gate-lang.is-guess')?.getAttribute('data-lang'), focus: document.activeElement?.getAttribute('data-lang'), q: location.search }))
  ok('перезагрузка: экран языка снова, сохранённый язык подсвечен и в фокусе, ?lang= нет', s.gate && s.pre === 'en' && s.focus === 'en' && !s.q.includes('lang='), JSON.stringify(s))
  await page.locator('.gate-lang[data-lang="en"]').click()
  await closed(page)
  const on = await audio(page)
  ok('после перезагрузки и выбора языка звук снова enabled и running', on?.enabled === true && on?.state === 'running', JSON.stringify(on))
  ok('кнопка звука в шапке показывает «вкл»', (await page.getAttribute('.sound-btn', 'aria-pressed')) === 'true')
  ok('localStorage без ключа звука', !(await page.evaluate(() => Object.keys(localStorage).some((k) => /sound/i.test(k)))))
  // 5. planes ~7 s after the gate: sound running at launch
  await page.waitForSelector('.egg-plane', { timeout: 9000 }).catch(() => null)
  const atLaunch = await audio(page)
  ok('вылет самолётиков после гейта: state running, enabled true', (await page.locator('.egg-plane').count()) > 0 && atLaunch?.state === 'running' && atLaunch?.enabled === true, JSON.stringify(atLaunch))
  // 6. hide / show the tab → running again
  await page.evaluate(() => window.__audioSuspend?.())
  const suspended = (await audio(page))?.state
  await page.evaluate(() => {
    const set = (v) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    set('hidden')
    set('visible')
  })
  await page.waitForTimeout(300)
  ok('вкладка скрыта и возвращена → state running', suspended === 'suspended' && (await audio(page))?.state === 'running', `было ${suspended}`)
  await ctx.close()
}

// 7. ?lang=ru: no gate, enabled, running after the first pointerdown
{
  const { ctx, page } = await open('d1280', '?lang=ru')
  await page.waitForTimeout(800)
  const before = await audio(page)
  await page.mouse.click(600, 770)
  await page.waitForTimeout(300)
  const after = await audio(page)
  ok('?lang=ru: экрана нет, enabled true', !(await gateVisible(page)) && before?.enabled === true, JSON.stringify(before))
  ok('?lang=ru: после первого касания state running', after?.state === 'running', JSON.stringify(after))
  await ctx.close()
}
{
  const { ctx, page } = await open('d1280', '?og=1')
  ok('?og=1: экрана нет', (await page.locator('.gate').count()) === 0)
  await ctx.close()
}

// 8. dist: no switch strings
if (!process.env.BASE_URL) {
  const walk = (d, o = []) => (readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n), o) : o.push(join(d, n)))), o)
  const hits = []
  for (const f of walk(join(root, 'dist')).filter((f) => /\.(js|css|html|json)$/.test(f))) {
    const s = readFileSync(f, 'utf8')
    for (const w of SWITCH_TEXTS) if (s.includes(w)) hits.push(`${f.split(/[\\/]/).pop()}: ${w}`)
  }
  ok('dist: нет текстов свитча звука', !hits.length, hits.join(', '))
}

await browser.close()
await close()
console.log(res.join('\n'))
if (res.some((l) => l.startsWith('✗'))) process.exitCode = 1
