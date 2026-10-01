// Functional checks from docs/04-acceptance.md against the production build.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { serve } from './serve.mjs'

const { url, close } = await serve()
const browser = await chromium.launch()
const res = []
const ok = (name, cond) => res.push(`${cond ? '✓' : '✗'} ${name}`)

let ctx = await browser.newContext({ ignoreHTTPSErrors: !!process.env.BASE_URL, acceptDownloads: true, viewport: { width: 1280, height: 800 } })
let page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(url + '/?intro=0', { waitUntil: 'networkidle' })
for (const [code, lang] of [['KZ', 'kk'], ['EN', 'en'], ['CZ', 'cs']]) {
  await page.locator('.langs .lang-btn', { hasText: code }).click()
  const s = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, q: location.search }))
  ok(`язык ${code}: html lang, title, ?lang=`, s.lang === lang && s.q.includes(`lang=${lang}`) && s.title.length > 5)
}
await page.reload({ waitUntil: 'networkidle' })
ok('язык сохраняется после перезагрузки', (await page.evaluate(() => document.documentElement.lang)) === 'cs')
await page.locator('#main-cta').click()
ok('главная кнопка открывает выбор из 2 менеджеров', (await page.locator('.chooser .pick').count()) === 2)
await page.keyboard.press('Escape')
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.stub-actions .pill').first().click()])
const vcf = readFileSync(await dl.path(), 'utf8')
ok(`vCard ${dl.suggestedFilename()}: BEGIN/END/FN, без TODO`, vcf.startsWith('BEGIN:VCARD') && vcf.includes('END:VCARD') && vcf.includes('FN:S ABROAD') && vcf.includes('+77075858747') && vcf.includes('+77018009045') && !vcf.includes('TODO') && !/ukr/i.test(vcf))
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
await page.evaluate(() => { navigator.share = undefined })
await page.locator('.stub-actions .pill').nth(1).click()
await page.waitForTimeout(400)
ok('«Поделиться» без Web Share → toast', (await page.locator('.toast').count()) === 1)
ok('QR ведёт на домен из site.json', (await page.getAttribute('.stub-qr .qr', 'data-qr')) === 'https://s-abroad.asia/')
ok('звук по умолчанию выключен', (await page.getAttribute('.sound-btn', 'aria-pressed')) === 'false')
await page.locator('.sound-btn').click()
await page.reload()
ok('звук: состояние помнится', (await page.getAttribute('.sound-btn', 'aria-pressed')) === 'true')
ok('консоль без ошибок', errors.length === 0)
await ctx.close()

ctx = await browser.newContext({ ignoreHTTPSErrors: !!process.env.BASE_URL, reducedMotion: 'reduce' })
page = await ctx.newPage()
await page.goto(url + '/?intro=1', { waitUntil: 'networkidle' })
ok('reduced motion: плоский самолёт не летит', (await page.$eval('.route-plane', (e) => getComputedStyle(e).animationName)) === 'none')
await ctx.close()

const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] })
page = await b2.newPage({ ignoreHTTPSErrors: !!process.env.BASE_URL })
const e2 = []
page.on('pageerror', (e) => e2.push(String(e)))
await page.goto(url + '/', { waitUntil: 'networkidle' })
ok('без WebGL → SVG-глобус, без ошибок', (await page.locator('.globe-fallback').count()) === 1 && !e2.length)
await b2.close()
await browser.close()
await close()
console.log(res.join('\n'))
