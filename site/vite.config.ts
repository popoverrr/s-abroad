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
        // domain is a full URL (may already include the Pages base path)
        const url = ok(site.domain) ? (/^https?:\/\//.test(site.domain) ? site.domain : `https://${site.domain}`).replace(/\/*$/, '/') : ''
        const og = url ? `${url}og.png` : `${base}og.png`
        const sameAs = site.socials.map((x: { url: string }) => x.url.split(/[?#]/)[0])
        const phones = site.managers.filter((m: { phone: string }) => ok(m.phone)).map((m: { phone: string }) => '+' + m.phone.replace(/\D/g, ''))
        const ld: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: site.brand,
          description: ru.meta.description,
          sameAs,
          telephone: phones,
          contactPoint: phones.map((telephone: string) => ({ '@type': 'ContactPoint', telephone, contactType: 'customer service', availableLanguage: ['ru', 'kk', 'en'] })),
        }
        if (url) ld.url = url
        let out = html
          .replaceAll('%OG_IMAGE%', og)
          .replace('<!--JSON-LD-->', `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
        const alt = ['ru', 'en', 'kk']
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
