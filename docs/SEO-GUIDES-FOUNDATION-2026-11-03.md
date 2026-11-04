# Отчёт: SEO-/контентный фундамент раздела /guides/ — 2026-11-03

Репозиторий: `rudoctors/rudoctors.github.io`
Ветка: `agent/guides-foundation-remediation-2026-11-03`
Дата: 2026-11-03

## Checked

- `npm run check` — **0 errors, 0 warnings, 1 pre-existing hint** (`src/pages/add-doctor.astro:276`, deprecated `document.execCommand`).
- `npm run build` — **успешно**, 498 страниц, `sitemap-index.xml` создан в `dist/` (6 новых страниц `/guides/`).
- База до правок: раздел `/guides/` отсутствовал целиком; sitemap, robots и мета-robots корректны для существующих страниц.

## Confirmed

- `Layout.astro` поддерживает `noindex`, canonical, breadcrumbs и JSON-LD — для черновиков достаточно `noindex`.
- Существующий паттерн скрытия черновиков: `noindex` + `Disallow` в robots + исключение в sitemap-фильтре (пример: `/packages/`).

## Defects

- Отсутствовал целевой контентный слой `/guides/` для навигационных тем здоровья Сербии.

## Fixes

- Создан раздел `/guides/` со страницей-заголовком и ровно пятью черновыми гайдами (темы без клинических рекомендаций):
  - `/guides/finding-doctor/` — как найти врача в Сербии;
  - `/guides/public-private-care/` — государственная поликлиника и приватная клиника;
  - `/guides/insurance-appointments/` — страховка и запись к врачу;
  - `/guides/choosing-clinic/` — как выбрать клинику и записаться;
  - `/guides/labs-diagnostics-belgrade/` — лабораторные анализы и диагностика в Белграде.
- Все страницы раздела: видимый статус draft, дисклеймер о не-культурной направленности, метаданные source/date/review = TBD.
- Sitemap-фильтр расширен исключением `/guides`; robots.txt: `Disallow: /guides/`.

## Files

- `src/pages/guides/index.astro`
- `src/pages/guides/finding-doctor.astro`
- `src/pages/guides/public-private-care.astro`
- `src/pages/guides/insurance-appointments.astro`
- `src/pages/guides/choosing-clinic.astro`
- `src/pages/guides/labs-diagnostics-belgrade.astro`
- `astro.config.mjs`
- `public/robots.txt`
- `docs/SEO-GUIDES-FOUNDATION-2026-11-03.md`

## Tests

- `npm run check` — 0 errors / 0 warnings / 1 pre-existing hint.
- `npm run build` — успешно (498 страниц).

## Blockers

- Нет human source/medical review: source, date и review пока `TBD`.

## Evidence

- Build-вывод: 498 страниц, `sitemap-index.xml` создан.
- Sitemap после сборки: без `/guides/` (исключение применено).
- Robots после сборки: `Disallow: /guides/`.
- В `dist/guides/*.html`: `<meta name="robots" content="noindex, nofollow">`, draft-текст, TBD-метаданные — подтверждено.

## Next steps

- Заполнить source/date/review после human source/medical review.
- Снять `noindex` только после согласования контента человеком.
- После одобрения — добавить гайды в sitemap и навигацию.
