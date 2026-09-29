# 03 — Техника

## Стек
- Vite (latest) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/vite`), токены из `docs/02-design.md` в `@theme`
- `motion` (Framer Motion) — анимации, spring-тилт
- `cobe` — глобус
- `qrcode` — генерация QR в SVG (на билде или в рантайме, на твой выбор)
- `@fontsource-variable/unbounded`, `@fontsource-variable/onest`, `@fontsource-variable/jetbrains-mono` (если нет variable-пакета — обычный `@fontsource/...`, только нужные начертания и сабсеты cyrillic, cyrillic-ext, latin, latin-ext)
- Dev: `playwright` (скриншоты, проверки), `sharp` (иконки, og.png)
Никаких UI-китов, роутеров, i18n-библиотек, стейт-менеджеров.

## Структура
```
site/
  index.html
  public/            favicon.svg, icons, og.png, manifest.webmanifest, robots.txt
  scripts/
    check-todo.mjs   печатает TODO-поля из src/content/site.json, exit 0
    icons.mjs        из assets/mark.svg → 192/512/maskable/apple-touch PNG
    og.mjs           Playwright: открыть /?og=1 на 1200×630, сохранить public/og.png
    shots.mjs        Playwright: скриншоты по docs/04-acceptance.md
  src/
    content/         копия content/ (site.json + i18n/*.json)
    i18n/            I18nProvider, useT(), детект языка
    audio/           sound.ts (WebAudio синтез), SoundProvider
    lib/             links.ts (сборка href), vcard.ts, share.ts
    components/      TopBar, Hero, DepartureBoard, SplitFlap, Globe, BoardingPass,
                     GateRow, Stub, Stamps, Stamp, QrModal, StickyCta, Toast, Footer, Grain, OgCard
    styles/          index.css (@theme, база)
    App.tsx, main.tsx
```
Скрипты package.json: `dev`, `build` (tsc -b && vite build), `preview`, `check:todo`, `icons`, `og`, `shots`.

## Конфиг и ссылки
`site.json` — единый источник. Правила:
- `""` → элемент скрыть.
- строка `TODO…` → показать, но `href="#todo"`, атрибут `data-todo`, `console.warn` в dev. В проде не должно быть ошибок в консоли — только warn в dev.
- WhatsApp: `https://wa.me/<digits>?text=<encodeURIComponent(msg)>`, где msg — из i18n текущего языка (`wa.default` или `services[i].wa`).
- Телефон: `tel:+<digits>`, отображать форматированно `+7 700 000 00 00`.
- Instagram: `https://www.instagram.com/<handle>/`.
- Telegram: `https://t.me/<handle>`.
- `links[]` задаёт порядок и нумерацию выходов (номера считаются по видимым строкам: 01, 02…).

## i18n
- Языки: `ru` (default), `kk`, `en`, `cs`. В UI подписи кнопок: RU / KZ / EN / CZ.
- Порядок выбора: `?lang=` → `localStorage` → `navigator.languages` (`kk*`→kk, `cs*`/`sk*`→cs, `en*`→en, `ru*`/`uk*`→ru) → ru.
- При смене: обновить `<html lang>`, `document.title`, meta description, `?lang=` через `history.replaceState`. Текст меняется с коротким crossfade (150 мс), без прыжков вёрстки (зарезервируй высоту слогана).
- Типизированный ключ: тип выводится из `ru.json`; сборка падает, если в другом языке нет ключа (проверка в `tsc` или маленький тест-скрипт в `build`).

## SEO / мета
- `<title>` и description из `ru.json` → `meta`, обновляются при смене языка.
- OG/Twitter: title, description, `og:image` = `/og.png` (абсолютный URL из `site.json → domain`, если домен не TODO; иначе относительный и пометка в отчёте), `og:locale` ru_RU + alternates.
- JSON-LD `EducationalOrganization`: name, url, sameAs (instagram, филиалы), telephone (если не TODO).
- `theme-color` #0A0D14, `color-scheme: dark`.
- `robots.txt` allow all.

## OG-картинка
Маршрут `/?og=1` рендерит `OgCard` 1200×630: слева знак, S ABROAD, слоган RU, табло с PRAHA; справа кусок талона с тремя выходами. `scripts/og.mjs` снимает его Playwright-ом в `public/og.png`. Запускай после билда через `vite preview`.

## PWA (лёгкий)
`manifest.webmanifest`: name «S ABROAD», short_name «S ABROAD», display standalone, background/theme #0A0D14, иконки 192/512/maskable. Service worker не нужен.

## Производительность
- JS ≤ 150 КБ gzip. Глобус — ленивая загрузка (`import('cobe')`) после первого кадра / при `requestIdleCallback`.
- Шрифты: preload display-шрифта, `font-display: swap`, только нужные сабсеты.
- Без layout shift: фиксированные размеры канваса, штампов, QR.
- Картинок-фото нет → LCP = текст слогана.

## Деплой
Результат — статика `site/dist`. Добавь `site/vercel.json` не нужно; просто в README напиши: Vercel/Netlify — root `site`, build `npm run build`, output `dist`. Для GitHub Pages — `base` в vite.config через env.
