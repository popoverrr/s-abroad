import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const base = process.env.BASE || '/'

/** SEO bits that depend on content/site.json: absolute og:image, JSON-LD, preload of the display font. */
function seo(): Plugin {
  const read = () => JSON.parse(readFileSync(here('./src/content/site.json'), 'utf8'))
  const ok = (v: string) => !!v && !v.trim().startsWith('TODO')
  return {
    name: 's-abroad-seo',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const site = read()
        const ru = JSON.parse(readFileSync(here('./src/content/i18n/ru.json'), 'utf8'))
        const domain = ok(site.domain) ? `https://${site.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}` : ''
        const url = domain ? domain + base : ''
        const og = url ? `${url}og.png` : `${base}og.png`
        const sameAs = site.links
          .filter((l: { type: string; enabled?: boolean; handle?: string }) => l.type === 'instagram' && l.enabled !== false && l.handle)
          .map((l: { handle: string }) => `https://www.instagram.com/${l.handle}/`)
        const ld: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: site.brand,
          description: ru.meta.description,
          sameAs,
        }
        if (url) ld.url = url
        if (ok(site.contacts.phone)) ld.telephone = '+' + site.contacts.phone.replace(/\D/g, '')
        let out = html
          .replaceAll('%OG_IMAGE%', og)
          .replace('<!--JSON-LD-->', `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
        const alt = ['ru', 'kk', 'en', 'cs']
          .map((l) => `<link rel="alternate" hreflang="${l}" href="${url || base}?lang=${l}" />`)
          .join('\n    ')
        out = out.replace('</title>', `</title>\n    ${alt}`)
        if (url) out = out.replace('</title>', `</title>\n    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />`)
        // Preload the display font (cyrillic + latin) so the slogan — the LCP — paints in the right face.
        if (ctx.bundle) {
          const fonts = Object.keys(ctx.bundle).filter((f) => /unbounded-(cyrillic|latin)-wght-normal.*\.woff2$/.test(f))
          const links = fonts.map((f) => `<link rel="preload" href="${base}${f}" as="font" type="font/woff2" crossorigin />`).join('\n    ')
          out = out.replace('</title>', `</title>\n    ${links}`)
        }
        return out
      },
    },
  }
}

// GitHub Pages: BASE=/repo-name/ npm run build
export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), seo()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 400,
  },
  preview: { port: 4173, strictPort: true },
  server: { port: 5173 },
})
