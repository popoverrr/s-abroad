// Copies ../content (single source of truth) and ../assets/brand into the app before dev/build.
// If the parent folders are absent (e.g. the site folder was deployed alone), the existing copy is kept.
import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(root, '..', 'content')
const assets = join(root, '..', 'assets')

if (existsSync(content)) {
  cpSync(content, join(root, 'src', 'content'), { recursive: true })
  console.log('[sync] content/ → src/content/')
}
if (existsSync(join(assets, 'brand'))) {
  const dst = join(root, 'src', 'assets', 'brand')
  mkdirSync(dst, { recursive: true })
  for (const f of readdirSync(join(assets, 'brand')).filter((f) => f.endsWith('.svg'))) copyFileSync(join(assets, 'brand', f), join(dst, f))
  copyFileSync(join(assets, 'favicon.svg'), join(root, 'public', 'favicon.svg'))
  // v1 placeholder mark is gone for good.
  rmSync(join(root, 'src', 'assets', 'mark.svg'), { force: true })
  // manager photos (v7)
  const team = join(assets, 'team')
  if (existsSync(team)) cpSync(team, join(root, 'src', 'assets', 'team'), { recursive: true })
  console.log('[sync] assets/brand/*.svg → src/assets/brand/, favicon.svg → public/')
}
