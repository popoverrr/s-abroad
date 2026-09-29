// assets/mark.svg (or a real assets/logo.*) → PWA icons, apple-touch-icon, manifest.
import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import './sync-content.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'icons')
mkdirSync(out, { recursive: true })

const INK = '#0A0D14'
const svgPath = join(root, 'src', 'assets', 'mark.svg')
const pngPath = join(root, 'src', 'assets', 'mark.png')

/** The mark on the brand background; `pad` = share of the canvas left around the mark. */
async function icon(size, pad, file, radius = 0) {
  const inner = Math.round(size * (1 - pad * 2))
  let mark
  if (existsSync(svgPath)) {
    const svg = readFileSync(svgPath, 'utf8').replaceAll('currentColor', '#EDEAE3')
    mark = await sharp(Buffer.from(svg), { density: 600 }).resize(inner, inner).png().toBuffer()
  } else {
    mark = await sharp(pngPath).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  }
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/></svg>`,
  )
  await sharp(bg)
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(join(out, file))
  console.log(`[icons] ${file}`)
}

await icon(192, 0.14, 'icon-192.png', 0)
await icon(512, 0.14, 'icon-512.png', 0)
await icon(512, 0.24, 'maskable-512.png', 0) // safe zone for maskable
await icon(180, 0.14, 'apple-touch-icon.png', 0)

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
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
writeFileSync(join(root, 'public', 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(join(root, 'public', 'robots.txt'), 'User-agent: *\nAllow: /\n')
console.log('[icons] manifest.webmanifest, robots.txt')
