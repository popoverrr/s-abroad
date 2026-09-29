// Starts `vite preview` on dist/ (or reuses a URL passed as BASE_URL) for the Playwright scripts.
import { preview } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export async function serve() {
  if (process.env.BASE_URL) return { url: process.env.BASE_URL.replace(/\/$/, ''), close: async () => {} }
  const server = await preview({ root, preview: { port: 4173, strictPort: false, host: '127.0.0.1' }, logLevel: 'warn' })
  const url = server.resolvedUrls.local[0].replace(/\/$/, '')
  return { url, close: () => server.close() }
}
