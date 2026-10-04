// assets/brand/mark-s.svg → PWA icons, apple-touch-icon, manifest.
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import './sync-content.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'pwa')
mkdirSync(out, { recursive: true })

const INK = '#00754A' // theme & background colour = field
const BRAND = '#00754A'
const markPath = join(root, 'src', 'assets', 'brand', 'mark-s.svg')

/** White S mark on the brand green; `pad` = share of the canvas left around the mark. */
async function icon(size, pad, file) {
  const inner = Math.round(size * (1 - pad * 2))
  const svg = readFileSync(markPath, 'utf8').replaceAll('currentColor', '#FFFFFF')
  const mark = await sharp(Buffer.from(svg), { density: 600 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${BRAND}"/></svg>`)
  await sharp(bg).composite([{ input: mark, gravity: 'center' }]).png().toFile(join(out, file))
  console.log(`[icons] ${file}`)
}

await icon(192, 0.18, 'icon-192.png')
await icon(512, 0.18, 'icon-512.png')
await icon(512, 0.26, 'maskable-512.png') // safe zone for maskable
await icon(180, 0.18, 'apple-touch-icon.png')

const manifest = {
  name: 'S ABROAD',
  short_name: 'S ABROAD',
  description: 'Обучение и каникулы за рубежом',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: INK,
  theme_color: INK,
  icons: [
    { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
writeFileSync(join(root, 'public', 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(join(root, 'public', 'robots.txt'), 'User-agent: *\nAllow: /\n')
console.log('[icons] manifest.webmanifest, robots.txt')
