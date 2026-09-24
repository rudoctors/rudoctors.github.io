# Аудит Rudoctors (сводка)

Агент-исследователь, ~76 находок. Детали приведены по severity. Обновлять статус при закрытии.

## CRITICAL (закрыть в Phase 1)

| ID | Проблема | Где | Статус |
|----|----------|-----|--------|
| C1 | Seed удаляет все JSON → теряет hidden/featured/ручные правки админки | `scripts/seed.mjs` | **fixed** (merge-in-place) |
| C2 | PAT в localStorage без TTL/CSP | `src/pages/admin/index.astro` | **fixed** (спринт F: memory-only, без storage; warning public device) |
| C3 | JSON-LD через `set:html` без экранирования `</script>` → XSS | `src/layouts/Layout.astro` | **fixed** (`\u003c`) |
| C4 | Все scraped отзывы hardcode `rating: 5` → ложный рейтинг | `scripts/seed.mjs` | **fixed** (rating 0 = text-only) |
| C5 | Дубликаты людей (4 пары) | `src/data/doctors/` | **fixed** (59 карт) |
| C6 | Битый JSON молча пропускается → нужен fail-fast CI | `src/lib/doctors.ts` | **fixed** (throw) |
| C7 | `href` из данных без allowlist → `javascript:` | `src/pages/doctors/[slug].astro` | **fixed** (`safeUrl`) |
| C8 | Slug из кириллицы → `doctor-<timestamp>` | `src/pages/admin/index.astro` | **fixed** (slugify CYR) |

## HIGH (Phase 5 / частично Phase 2–3)

- **done Phase 5:** og:image, noindex+sitemap, 404, privacy, contacts, FAQ, WebP 53 фото (~40MB→~1MB), city slug `novi-sad`, hreflang, aria-live, PR job, strict schema.
- Freshness мёртв (отзывы без дат); стаж частично (citilab + alfa).
- Popup-blocker на формах; a11y (focus, labels); «Belgrade» в русском UI.
- **done Phase 2–4:** 140 карт, Sheets/citilab/TG fetch, merge-safe seed, cron Mon/Thu, commit-if-diff.
- **done Phase 3:** EN→RU перевод агентом (44+6), UI original details; TG candidates — без имени врача, N/A.
- **done:** self-host Manrope (woff2 local, без Google Fonts CDN); удалены legacy JPG (53).

## MEDIUM / LOW

- SEO-мелочи, plural — частично закрыто (Niš, allergist intro, robots, llms, 404, about/contacts FAQ).
- a11y: aria-expanded/controls, aria-label профиля, autocomplete, honeypot+cooldown — **done** (спринт B); skip-link, nav aria-label, Banner H2 — **done** (спринт F).
- Thin content: city-intros/specialty-intros/about/contacts/faq — **done** (спринт C); list-intro specialties/cities — **done** (спринт F).
- Perf `/doctors/`: data-bio убран, пагинация 24/page D2 — **done** (спринт D); LCP eager+fetchpriority первые 3 карточки главной/каталога — **done** (спринт F).
- Security headers GH Pages: поддерживаемые meta CSP/referrer — **done** (спринт F); XFO/XCTO и `frame-ancestors` через meta не работают, нужен CDN/другой хостинг для response headers.

## Новый аудит 24.09.2026 (seomator/ai-native/rudoctors — score ~78–95)

- **P0.1** `/admin/` без серверной auth — частично: noindex+robots+warning+ToS; сервер невозможен на GH Pages.
- **P0.2** PAT sessionStorage — **fixed** (спринт F): только память вкладки, legacy-ключи очищаются при загрузке, analytics отключены на `/admin/`.
- **P0.3** license fields — **partially done**: `LicenseInfo`/`verificationStatus`, profile UI и provenance gate готовы; данных лицензий/статусов в 140 JSON пока **0**, поэтому пункт остаётся открытым до официальной проверки.
- **P0.4** Forms → public Issues — **fixed** (спринт F): точный disclosure, consent, privacy и trim-валидация; Issue создаётся только после подтверждения на GitHub.
- **P0.5** Security headers — **partial by platform**: meta CSP/referrer; реальные XFO/XCTO/CSP headers требуют CDN/другого хостинга.
- **P1** LCP priority, breadcrumbs list pages, Terms of Service, CTA «Разместить рекламу», robots BOM, form validation, privacy analytics status — **done** (спринт F).
- **Open:** официальные license/verification данные; реквизиты владельца в ToS перед платным контрактом; underscore-слаги; orphan-link depth; DOM size `/doctors/`; DHD-отчёт = другой сайт.

## Continuous update
**done:** cron refresh + merge-safe seed + fuzzy name match. Schema validation строгая в loadDoctors.

## Монетизация
**done Phase 6:** click-track + analytics hooks; `/packages/` скрыт (noindex, без public-ссылок); UI без «Рекомендуем»; test banners (страховка/клиника).

Open: PAT E2E hide-flow (PAT создан); первый banner/placement request до 15.12.2026.
Open: analytics GH Secrets не созданы (`gh secret list` пуст) — Plausible/Umami ключи.