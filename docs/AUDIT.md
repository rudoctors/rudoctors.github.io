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

- Нет `og:image`; `noindex` может попадать в sitemap. **fixed:** дубль `neurologist`, cron, raw не в git, EN→`lang=en` (перевод ждёт ключ).
- Freshness мёртв (отзывы без дат); 50/50 отзывов только EN (UI: бейдж EN; `npm run translate` после ключа); стаж частично (citilab + alfa).
- Popup-blocker на формах; privacy-форм; a11y (focus, labels); «Belgrade» в русском UI.
- Фото ~40MB без WebP; нет 404/privacy; `featured=0`; нет analytics; нет E2E hide-flow (PAT).
- **done Phase 2–4:** 140 карт, Sheets/citilab/TG fetch, merge-safe seed, cron Mon/Thu, commit-if-diff.

## MEDIUM / LOW
SEO-мелочи, plural, city slug `novi-sad`, haystack, PR job в Actions.

## Continuous update
**done:** cron refresh + merge-safe seed + fuzzy name match. Schema validation — fail-fast в loadDoctors.

## Монетизация
featured=0 (продукт невидим), нет аналитики, нет страницы пакетов, нет E2E hide-flow (нужен PAT).
