// Prints every field in src/content/site.json that still starts with "TODO". Always exits 0.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import './sync-content.mjs'

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'site.json')
const site = JSON.parse(readFileSync(file, 'utf8'))
const found = []

;(function walk(v, path) {
  if (typeof v === 'string' && v.trim().startsWith('TODO')) found.push([path, v])
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k)
})(site, '')

if (!found.length) console.log('✓ content/site.json: нет незаполненных TODO-полей')
else {
  console.log(`⚠ content/site.json — заполните ${found.length} пол${found.length === 1 ? 'е' : 'я'}:`)
  for (const [p, v] of found) console.log(`  • ${p}: ${v}`)
}
