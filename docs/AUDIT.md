# Аудит Rudoctors (сводка)

Агент-исследователь, ~76 находок. Детали приведены по severity. Обновлять статус при закрытии.

## CRITICAL (закрыть в Phase 1)

| ID | Проблема | Где | Статус |
|----|----------|-----|--------|
| C1 | Seed удаляет все JSON → теряет hidden/featured/ручные правки админки | `scripts/seed.mjs` | **fixed** (merge-in-place) |
| C2 | PAT в localStorage без TTL/CSP | `src/pages/admin/index.astro` | **fixed** (sessionStorage + 8h TTL) |
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
- Остаток MEDIUM: self-host fonts.

## MEDIUM / LOW
SEO-мелочи, plural; self-host fonts.

## Continuous update
**done:** cron refresh + merge-safe seed + fuzzy name match. Schema validation строгая в loadDoctors.

## Монетизация
**done Phase 6 (без PAT):** `/packages/` цены, featured demo (2 карточки), click-track + analytics hooks.  
Open: PAT E2E hide-flow; ключ `PUBLIC_PLAUSIBLE_DOMAIN`/`PUBLIC_UMAMI_WEBSITE_ID`; первый featured request до 15.12.2026.
