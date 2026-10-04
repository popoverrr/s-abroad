// Language gate acceptance (docs/08-language-gate-v5.md § «Приёмка v5») + screenshots/gate-*.png.
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

async function open(view, query = '', extra = {}) {
  const ctx = await browser.newContext({ ...VIEWS[view], ignoreHTTPSErrors: true, locale: 'ru-RU', ...extra })
  const page = await ctx.newPage()
  const errors = []
  const warnings = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => (m.type() === 'error' ? errors : m.type() === 'warning' ? warnings : []).push(m.text()))
  await page.goto(`${url}/${query}`, { waitUntil: 'load' })
  return { ctx, page, errors, warnings }
}
const gateVisible = (page) => page.evaluate(() => !!document.querySelector('.gate:not(.is-closing)'))

// 1. Clean profile: gate on the first frame, main inert, no egg timer
{
  const { ctx, page, errors } = await open('d1280', '?nogl')
  const first = await gateVisible(page)
  const inert = await page.evaluate(() => document.querySelector('main')?.hasAttribute('inert'))
  await page.screenshot({ path: join(out, 'gate-d1280.png') })
  await page.waitForTimeout(9000)
  const planes = await page.locator('.egg-plane').count()
  ok('чистый профиль: гейт виден сразу, main inert, самолётиков нет и через 9 с', first && inert && planes === 0, `гейт ${first}, inert ${inert}, самолётиков ${planes}`)
  ok('чистый профиль: консоль без ошибок', !errors.length, errors.join(' | '))
  await ctx.close()
}

// 2. Fits without scroll; board in one line at 360; three board states
for (const view of ['m360', 'm390', 'd1280']) {
  const { ctx, page } = await open(view)
  await page.waitForTimeout(700)
  const m = await page.evaluate(() => {
    const g = document.querySelector('.gate')
    const col = document.querySelector('.gate-col').getBoundingClientRect()
    const row = document.querySelector('.gate-board .board-row')
    const flaps = document.querySelector('.gate-board .flaps').getBoundingClientRect()
    const cell = document.querySelector('.gate-board .cell').getBoundingClientRect()
    return {
      overflowY: g.scrollHeight > g.clientHeight + 1,
      overflowX: g.scrollWidth > g.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
      fits: col.top >= 0 && col.bottom <= innerHeight,
      oneLine: row.scrollWidth <= row.clientWidth + 1 && flaps.height < cell.height * 1.5,
      boardInside: document.querySelector('.gate-board').getBoundingClientRect().right <= innerWidth,
    }
  })
  ok(`${view}: гейт без скролла и переполнения`, !m.overflowY && !m.overflowX && m.fits, JSON.stringify(m))
  ok(`${view}: табло гейта в одну строку`, m.oneLine && m.boardInside)
  if (view !== 'd1280') await page.screenshot({ path: join(out, `gate-${view}.png`) })
  if (view === 'm360') {
    // board lines change every 2.2 s; capture each one ~1 s after it lands (page opened ~0.7 s ago)
    const t0 = Date.now() - 700
    for (const [i, name] of ['ru', 'en', 'kk'].entries()) {
      await page.waitForTimeout(Math.max(0, i * 2200 + 1300 - (Date.now() - t0)))
      await page.locator('.gate-board').screenshot({ path: join(out, `gate-board-${name}-m360.png`) })
    }
  }
  await ctx.close()
}

// 3–4. Click English: gate gone ≤ 0.6 s, lang applied, storage, running audio; planes ~7 s later
{
  const { ctx, page, errors } = await open('d1280', '?nogl')
  await page.waitForTimeout(500)
  await page.locator('.gate-lang[data-lang="en"]').click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(out, 'gate-closing-d1280.png') })
  const t0 = Date.now()
  await page.waitForSelector('.gate', { state: 'detached', timeout: 1000 }).catch(() => null)
  const gone = (await page.locator('.gate').count()) === 0
  const s = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    q: location.search,
    cta: document.querySelector('.cta-main-text b')?.textContent,
    storedLang: localStorage.getItem('sa-lang'),
    storedSound: localStorage.getItem('sa-sound'),
    audio: window.__audioState?.(),
    inert: document.querySelector('main')?.hasAttribute('inert'),
  }))
  ok('клик «English»: гейт исчез ≤ 0,6 с', gone && Date.now() - t0 + 200 <= 650, `${Date.now() - t0 + 200} мс`)
  ok('клик «English»: html lang, ?lang=en, тексты, localStorage, inert снят', s.lang === 'en' && s.q.includes('lang=en') && s.cta === en.cta.primary && s.storedLang === 'en' && s.storedSound === 'on' && !s.inert, JSON.stringify(s))
  ok('клик «English»: AudioContext running', s.audio === 'running', s.audio)
  await page.waitForTimeout(7600)
  ok('после гейта через ~7 с вылетают 3 самолётика', (await page.locator('.egg-plane').count()) === 3)
  await page.reload({ waitUntil: 'load' })
  ok('перезагрузка: гейта нет, язык сохранён', !(await gateVisible(page)) && (await page.evaluate(() => document.documentElement.lang)) === 'en')
  ok('выбор языка: консоль без ошибок', !errors.length, errors.join(' | '))
  await ctx.close()
}

// 5. Sound switch off → no AudioContext, "off" stored
{
  const { ctx, page } = await open('m390')
  await page.locator('.gate-sound').click()
  const checked = await page.getAttribute('.gate-sound', 'aria-checked')
  await page.locator('.gate-lang[data-lang="ru"]').click()
  await page.waitForTimeout(700)
  const s = await page.evaluate(() => ({ audio: window.__audioState?.(), sound: localStorage.getItem('sa-sound'), btn: document.querySelector('.sound-btn')?.getAttribute('aria-pressed') }))
  ok('свитч звука выкл → AudioContext не создан, звук off', checked === 'false' && s.audio === 'none' && s.sound === 'off' && s.btn === 'false', JSON.stringify(s))
  await ctx.close()
}

// 6. ?lang=kk → no gate; ?lang=cs → gate; ?gate=1 → always
{
  let { ctx, page } = await open('m390', '?lang=kk')
  ok('?lang=kk: гейта нет, сайт на казахском', !(await gateVisible(page)) && (await page.evaluate(() => document.documentElement.lang)) === 'kk')
  await ctx.close()
  ;({ ctx, page } = await open('m390', '?lang=cs'))
  ok('?lang=cs: гейт есть', await gateVisible(page))
  await ctx.close()
  ;({ ctx, page } = await open('m390', '?lang=ru&gate=1'))
  ok('?gate=1: гейт показан даже при выбранном языке', await gateVisible(page))
  await ctx.close()
  ;({ ctx, page } = await open('d1280', '?og=1'))
  ok('?og=1: гейта нет', (await page.locator('.gate').count()) === 0)
  await ctx.close()
}

// 7. Guess from navigator.languages
for (const [locale, want] of [
  ['kk-KZ', 'kk'],
  ['en-US', 'en'],
  ['de-DE', 'ru'],
]) {
  const { ctx, page } = await open('m390', '', { locale })
  const guess = await page.evaluate(() => document.querySelector('.gate-lang.is-guess')?.getAttribute('data-lang'))
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.gate-lang.is-guess')).backgroundColor)
  ok(`navigator.languages ${locale} → лаймовая кнопка ${want}`, guess === want && bg === 'rgb(210, 255, 58)', `${guess}`)
  await ctx.close()
}

// 8. Keyboard: Tab stays in the gate, Enter picks, Esc picks the guess
{
  let { ctx, page } = await open('d1280', '', { locale: 'en-US' })
  await page.waitForTimeout(300)
  const focus0 = await page.evaluate(() => document.activeElement?.getAttribute('data-lang'))
  let inside = true
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab')
    inside &&= await page.evaluate(() => !!document.activeElement?.closest('.gate'))
  }
  ok('клавиатура: начальный фокус на предугаданном, Tab не выходит из гейта', focus0 === 'en' && inside, `фокус ${focus0}`)
  await page.locator('.gate-lang[data-lang="kk"]').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(700)
  ok('клавиатура: Enter выбирает язык', (await page.evaluate(() => document.documentElement.lang)) === 'kk' && (await page.locator('.gate').count()) === 0)
  await ctx.close()
  ;({ ctx, page } = await open('d1280', '', { locale: 'kk-KZ' }))
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)
  ok('клавиатура: Esc выбирает предугаданный', (await page.evaluate(() => document.documentElement.lang)) === 'kk' && (await page.locator('.gate').count()) === 0)
  await ctx.close()
}

// 9. Returning visitor: no audio before the first gesture, running after; no console warnings
{
  const ctx = await browser.newContext({ ...VIEWS.d1280, ignoreHTTPSErrors: true })
  await ctx.addInitScript(() => {
    localStorage.setItem('sa-lang', 'ru')
    localStorage.setItem('sa-sound', 'on')
  })
  const page = await ctx.newPage()
  const warnings = []
  page.on('console', (m) => ['warning', 'error'].includes(m.type()) && warnings.push(m.text()))
  await page.goto(`${url}/`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const before = await page.evaluate(() => window.__audioState?.())
  const btn = await page.getAttribute('.sound-btn', 'aria-pressed')
  await page.mouse.click(600, 760)
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => window.__audioState?.())
  ok('вернувшийся: гейта нет, звук «вкл», до клика AudioContext не running', !(await gateVisible(page)) && btn === 'true' && before !== 'running', `до: ${before}`)
  ok('вернувшийся: после первого клика AudioContext running', after === 'running', after)
  ok('вернувшийся: 0 предупреждений в консоли', !warnings.length, warnings.join(' | '))
  await page.screenshot({ path: join(out, 'gate-header-after-m360.png'), clip: { x: 0, y: 0, width: 1280, height: 90 } })
  await ctx.close()
}
// header with three languages at 360
{
  const { ctx, page } = await open('m360', '?lang=ru')
  await page.waitForTimeout(500)
  const codes = await page.$$eval('.langs .lang-btn', (b) => b.map((x) => x.textContent))
  ok('шапка: RU · EN · KZ', codes.join(' ') === 'RU EN KZ', codes.join(' '))
  await page.screenshot({ path: join(out, 'gate-header-m360.png'), clip: { x: 0, y: 0, width: 360, height: 80 } })
  const html = await page.content()
  const bad = ['>CZ<', 'Čes', 'Česk', 'cs.json'].filter((w) => html.includes(w))
  ok('DOM: нет CZ / Čes / Česk / cs.json', !bad.length, bad.join(', '))
  await ctx.close()
}

// 10. dist: no Czech leftovers
if (!process.env.BASE_URL) {
  const walk = (d, o = []) => (readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n), o) : o.push(join(d, n)))), o)
  const hits = []
  for (const f of walk(join(root, 'dist')).filter((f) => /\.(js|css|html|json|webmanifest)$/.test(f))) {
    const s = readFileSync(f, 'utf8')
    for (const w of ['"CZ"', "'CZ'", 'cs_CZ', 'cs.json', 'Čes', 'Česk']) if (s.includes(w)) hits.push(`${f.split(/[\\/]/).pop()}: ${w}`)
  }
  ok('dist: нет чешского (CZ, cs.json, Čes, Česk)', !hits.length, hits.join(', '))
}

await browser.close()
await close()
console.log(res.join('\n'))
if (res.some((l) => l.startsWith('✗'))) process.exitCode = 1
