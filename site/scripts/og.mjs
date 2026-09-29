// Renders /?og=1 at 1200×630 and saves public/og.png. Run after `npm run build`, then build again.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './serve.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { url, close } = await serve()
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto(`${url}/?og=1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.screenshot({ path: join(root, 'public', 'og.png') })
await browser.close()
await close()
console.log('[og] public/og.png 1200×630')
