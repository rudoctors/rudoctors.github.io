# Rudoctors

Рейтинг и отзывы русскоязычных врачей Сербии: [https://rudoctors.github.io](https://rudoctors.github.io)

Статический сайт на Astro + TypeScript + Tailwind. Данные врачей — JSON в `src/data/doctors/` (GitHub как CMS), сборка и деплой — GitHub Actions → GitHub Pages.

## Команды

| Command | Action |
| --- | --- |
| `npm ci` | Зависимости |
| `npm run seed` | Пересобрать JSON врачей из источников (merge-in-place) |
| `npm run refresh` | fetch sheet+citilab → seed → tag EN → check |
| `npm run check` | `astro check` (типы) |
| `npm run build` | Сборка в `dist/` |
| `npm run preview` | Локальный просмотр сборки |
| `npm run translate` | Запасной API-перевод (no-op без `TRANSLATE_API_KEY`); основной путь — ИИ-агент |
| `npm run photos:webp` | JPG → WebP 512px + rewrite `photo` в JSON |
| `npm run detect:dups` | Поиск дублей имён |
| `astro dev --background` | Dev-сервер в фоне (см. AGENTS.md) |

## Структура

- `src/pages/` — каталог, карточки, специальности, города, формы, `/admin`
- `src/lib/rating.ts` — формула рейтинга (звёзды + отзывы + свежесть)
- `src/data/doctors/*.json` — карточки (редактируются вручную / через админку)
- `scripts/seed.mjs` — merge-трансформация публичных источников → JSON
- `scripts/fetch-*.mjs` — загрузка/скрейп источников (Sheets, citilab, TG, …)
- `.github/workflows/deploy.yml` — check → build → deploy Pages (+ cron refresh)
- `docs/` — PLAN, AUDIT, SOURCES, DECISIONS, OPS (трекинг состояния)

## Источники данных

См. `docs/SOURCES.md`: rusdoctors.net, alfamedstar, Google Sheets (public CSV), citilab.rs, Telegram `t.me/s/…`.  
Приоритет merge: manual/admin > sheets > citilab > tme > alfa > rusdoctors.

## Pipeline (Phase 0–4)

```text
fetch sources → seed merge-in-place → npm run check → build → Pages
```

- Continuous: cron 2×/нед → fetch → seed → check → commit if diff → deploy.
- Перевод EN→RU: ключи только в GH Secrets (не в репо).
- Статус фаз: `docs/PLAN.md`.

## Админка

Страница `/admin` читает/пишет карточки через GitHub Contents API. Нужен PAT с Contents RW (sessionStorage + TTL в браузере, в репо не попадает).

## Дисклеймер

Сайт носит информационный характер и не заменяет очный приём врача.
