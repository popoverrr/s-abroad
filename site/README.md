# S ABROAD — сайт-визитка

Vite + React 19 + TypeScript + Tailwind v4 + Motion, глобус — cobe. Статика, без бэкенда.

## Запуск
```
npm i
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview    # http://localhost:4173
```

## Где что менять
- Контакты, ссылки-выходы, города табло: `../content/site.json` (копируется в `src/content` при dev/build).
  `""` — скрыть, `TODO…` — показывается, но ведёт на `#todo`. `npm run check:todo` покажет, что не заполнено.
- Тексты RU/KZ/EN/CZ: `../content/i18n/*.json` (сборка падает, если в языке нет ключа).
- Логотип: положите `../assets/logo.svg` или `logo.png`, затем `npm run icons`.
- После смены домена/текстов: `npm run build && npm run og && npm run build` (перегенерирует og.png).

## Проверки
- `npm run shots` — скриншоты 5 ширин × RU/KZ в `screenshots/` + проверки раскладки
- `npm run check` — функциональные проверки (языки, ссылки, vCard, шаринг, звук, reduced motion, без WebGL)

## Деплой
- Vercel / Netlify: root `site`, build `npm run build`, output `dist`.
- Любой хостинг: залить содержимое `dist/`.
- GitHub Pages: `BASE=/<repo>/ npm run build` (workflow в `.github/workflows/pages.yml`).
