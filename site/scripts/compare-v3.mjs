// Before/after for the v3 colour pass.
//   node scripts/compare-v3.mjs before   → screenshots/v2-desktop.png, v2-mobile.png (live s-abroad.asia, still v2)
//   node scripts/compare-v3.mjs after    → v3-*.png from the local build + compare-v2-v3-{desktop,mobile}.png
import { chromium, devices } from 'playwright'
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'screenshots')
mkdirSync(out, { recursive: true })
const mode = process.argv[2] ?? 'after'

const VIEWS = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent },
}

const { url, close } = mode === 'before' ? { url: 'https://s-abroad.asia', close: async () => {} } : await serve()
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const tag = mode === 'before' ? 'v2' : 'v3'
for (const [name, opts] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  await page.goto(`${url}/?lang=ru&v=${Date.now()}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: join(out, `${tag}-${name}.png`) })
  await ctx.close()
  console.log(`[compare] ${tag}-${name}.png`)
}
await browser.close()
await close()

if (mode === 'after') {
  for (const name of Object.keys(VIEWS)) {
    const a = join(out, `v2-${name}.png`)
    const b = join(out, `v3-${name}.png`)
    if (!existsSync(a)) continue
    const m = await sharp(a).metadata()
    const gap = 40
    await sharp({ create: { width: m.width * 2 + gap, height: m.height, channels: 3, background: '#ffffff' } })
      .composite([
        { input: a, left: 0, top: 0 },
        { input: b, left: m.width + gap, top: 0 },
      ])
      .png()
      .toFile(join(out, `compare-v2-v3-${name}.png`))
    console.log(`[compare] compare-v2-v3-${name}.png (слева v2, справа v3)`)
  }
}
