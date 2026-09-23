# Rudoctors

Рейтинг и отзывы русскоязычных врачей Сербии: [https://rudoctors.github.io](https://rudoctors.github.io)

Статический сайт на Astro + TypeScript + Tailwind. Данные врачей — JSON в `src/data/doctors/` (GitHub как CMS), сборка и деплой — GitHub Actions → GitHub Pages.

## Команды

| Command | Action |
| --- | --- |
| `npm ci` | Зависимости |
| `npm run seed` | Пересобрать JSON врачей из `scripts/*-raw.json` |
| `npm run check` | `astro check` (типы) |
| `npm run build` | Сборка в `dist/` |
| `npm run preview` | Локальный просмотр сборки |

## Структура

- `src/pages/` — каталог, карточки, специальности, города, формы, `/admin`
- `src/lib/rating.ts` — формула рейтинга (звёзды + отзывы + свежесть)
- `src/data/doctors/*.json` — карточки (редактируются вручную / через админку)
- `scripts/seed.mjs` — трансформация публичных источников → JSON
- `.github/workflows/deploy.yml` — check → build → deploy Pages

## Админка

Страница `/admin` читает/пишет карточки через GitHub Contents API. Нужен PAT с правом `repo` (хранится только в браузере, в репозиторий не попадает).

## Дисклеймер

Сайт носит информационный характер и не заменяет очный приём врача.
