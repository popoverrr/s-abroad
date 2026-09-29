// Fails the build if any language misses a key (or has a different shape) compared to ru.json.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import './sync-content.mjs'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'i18n')
const load = (l) => JSON.parse(readFileSync(join(dir, `${l}.json`), 'utf8'))
const base = load('ru')
let errors = 0

function walk(a, b, path, lang) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) {
      console.error(`[i18n] ${lang}: ${path} must be an array of ${a.length}`)
      errors++
      return
    }
    a.forEach((v, i) => walk(v, b[i], `${path}[${i}]`, lang))
  } else if (a && typeof a === 'object') {
    for (const k of Object.keys(a)) {
      if (!b || typeof b !== 'object' || !(k in b)) {
        console.error(`[i18n] ${lang}: missing key ${path}.${k}`)
        errors++
      } else walk(a[k], b[k], `${path}.${k}`, lang)
    }
  } else if (typeof b !== 'string' || !b.trim()) {
    console.error(`[i18n] ${lang}: ${path} must be a non-empty string`)
    errors++
  }
}

for (const lang of ['kk', 'en', 'cs']) walk(base, load(lang), '', lang)
if (errors) process.exit(1)
console.log('[i18n] ru/kk/en/cs — all keys present')
