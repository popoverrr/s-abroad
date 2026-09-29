// Copies ../content (single source of truth) and ../assets into the app before dev/build.
// If the parent folders are absent (e.g. the site folder was deployed alone), the existing copy is kept.
import { cpSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(root, '..', 'content')
const assets = join(root, '..', 'assets')

if (existsSync(content)) {
  cpSync(content, join(root, 'src', 'content'), { recursive: true })
  console.log('[sync] content/ → src/content/')
}
if (existsSync(assets)) {
  const files = readdirSync(assets)
  const logo = files.find((f) => /^logo\.(svg|png)$/i.test(f))
  // A real logo overrides the placeholder mark everywhere.
  const mark = logo ?? 'mark.svg'
  const ext = mark.split('.').pop()
  copyFileSync(join(assets, mark), join(root, 'src', 'assets', `mark.${ext}`))
  if (!logo) copyFileSync(join(assets, 'favicon.svg'), join(root, 'public', 'favicon.svg'))
  console.log(`[sync] assets/${mark} → src/assets/mark.${ext}`)
}
