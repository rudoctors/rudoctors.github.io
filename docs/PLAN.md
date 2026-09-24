# План работ Rudoctors

Статус: **Phase 0–6 done** (порядок 0→1→2→3→4→5→6, 24.09.2026); open: PAT E2E, первый banner request
Цель монетизации: **баннерная реклама / продажа сайта** (приоритет над featured-пакетами); сигнал — первый banner/placement request до 15.12.2026.

## Фазы

| # | Фаза | Статус | Срок |
|---|------|--------|------|
| 0 | Docs: PLAN, AUDIT, SOURCES, DECISIONS, OPS + README | **done** | 0.5ч |
| 1 | CRITICAL fixes: seed merge, rating, XSS, PAT, дубликаты, fail-fast, slugify | **done** | 2–3ч |
| 2 | Данные: fetch-sheet, fetch-citilab, fetch-tg → 120–150 врачей | **done** | 3–5ч |
| 3 | Отзывы TG + перевод EN→RU | **done** (44 переведено агентом, 6 lang=ru; без API-ключа) | 3–4ч |
| 4 | Continuous update: cron + merge-safe seed | **done** | 2ч |
| 5 | HIGH polish: og:image, noindex, 404, privacy, FAQ, WebP | **done** | — |
| 6 | Монетизация: пакеты, featured demo, click-track, analytics hooks | **done** (PAT E2E — позже) | — |

## Phase 0 — Docs
- [x] `docs/PLAN.md`
- [x] `docs/AUDIT.md`
- [x] `docs/SOURCES.md`
- [x] `docs/DECISIONS.md`
- [x] `docs/OPS.md`
- [x] README: pipeline, источники, cron

## Phase 1 — CRITICAL fixes
- [x] Seed **merge-in-place**: не удалять все JSON; сохранять hidden/featured/ручные reviews/админ-правки
- [x] Убрать hardcode `rating: 5` у scraped reviews (rating: 0 = text-only; UI «без оценки»)
- [x] XSS: JSON-LD экранирование `<` → `\u003c`
- [x] URL allowlist (`safeUrl` http/https/tel/mailto/relative)
- [x] PAT: sessionStorage + TTL 8h + logout
- [x] Слиты дубликаты: igor-shtuchnyy, anna-zagarskih, nadezhda-bakuleva, yuliya-avakyanc (59 карт)
- [x] Fail-fast: битый JSON → throw в `loadDoctors()`
- [x] Slugify кириллицы в админке
- [x] Дубль `neurologist` в specialties.json убран
- [x] Verify: `npm run check` 0 err; `npm run build` 101 page

## Phase 2 — Данные
- [x] `scripts/fetch-sheet.mjs` — Google Sheets CSV (106 строк) → normalize → seed merge
- [x] `scripts/fetch-citilab.mjs` — citilab.rs (19 врачей, стаж, фото, booking)
- [x] `scripts/fetch-tg.mjs` — t.me/s/russmedicserbia (139 постов; 14 doctor_card, 2 review_candidate)
- [x] Ручной импорт визиток из Sheets — в seed (contacts/языки/документы)
- [x] Цель: **~140 карт** (база 120–150); дубли sheets/citilab/alfa слиты (`merge-dups-phase2` + fuzzy)
- [x] `npm run detect:dups` — 0 групп
- [x] Verify: check 0 err; build 184 pages; live smoke (home/therapist/Belgrade/doctor)

## Phase 3 — Отзывы + перевод
- [x] `scripts/tag-en-reviews.mjs` — 50 alfa-отзывов помечены `lang: "en"`
- [x] Перевод EN→RU **агентом** (не API): 44 текста + 6 already-RU → `text`/`textOriginal`/`langSource`
- [x] UI-бейдж + details «Оригинал (`langSource`)»
- [x] `scripts/translate-reviews.mjs` — no-op без ключа (запасной путь)
- [x] TG review_candidate: 2 шт. — без имени врача (1 clinic-level, 1 false positive tax) → импорт N/A

## Phase 4 — Continuous update
- [x] `schedule:` cron Mon/Thu 05:00 UTC в `deploy.yml`
- [x] Pipeline: fetch sheet+citilab → seed merge → tag en → (translate if secret) → check → build → commit if diff → Pages
- [x] Merge-safe против админки; raw intermediates в `.gitignore` (CI refetch)
- [x] Schema validation строгая в `loadDoctors` (slug/name/city/updatedAt/specs/formats/reviews)

## Phase 5 — HIGH polish
- [x] `og:image` (`public/og.png`) + twitter cards
- [x] `/admin`, forms — `noindex` + sitemap filter
- [x] `404.astro`, `privacy.astro`, `contacts.astro`, `faq.astro`
- [x] WebP: `npm run photos:webp` → 53 фото, ~40MB → ~1MB webp, photo → `.webp`; seed prefers `.webp`
- [x] city slug `novi-sad` (`citySlug`); hreflang ru + x-default; aria-live (filters, form status)
- [x] PR job: `pull_request` → check+build, без deploy
- [x] self-host fonts: Manrope woff2 в `public/fonts/` (6 subset, variable 400–800), `@font-face` в `global.css`, CDN-link убран, preload cyrillic+latin

## Phase 6 — Монетизация
- [x] Click-track: `Appointment Click` / `Outbound Click` → Plausible/Umami если env
- [x] Layout hooks: `PUBLIC_PLAUSIBLE_DOMAIN` / `PUBLIC_UMAMI_WEBSITE_ID`
- [x] Убраны UI «Рекомендуем» / «Рекомендуемые профили»; CTA → баннерная реклама
- [x] `/packages/` скрыт: `noindex`, вне sitemap, без публичных ссылок
- [x] Fix: аватарка Евгении Курамшиной → исходный `/photos/rd-59.webp` (180°-копия удалена)
- [x] Test banners: `banners.json` + `Banner.astro` (home-top страховка, home-bottom клиника, catalog-top страховка; prop `placement`)
- [x] Sprint A: JSON-LD @id organization/website, AggregateRating gate, safeUrl (t.me/www/@/http→https), robots Disallow forms/packages, fix-bad-urls (38 файлов)
- [x] Sprint B: Header aria-expanded/controls, DoctorCard aria-label, autocomplete + honeypot + cooldown formGuard (add-doctor, leave-review)
- [x] Sprint C: city-intros (Niš + расширение), specialty-intros (allergist, убран мёртвый lor), about/contacts/cities/specialties/faq расширены
- [x] Sprint D: doctors pagination D2 (пустые фильтры → 24/page, активный → полный список), убран data-bio, unique title page N
- [x] Sprint E: llms.txt markdown + Niš, 404 поиск+города, OPS security headers + контент-модель, analytics GH Secrets **пусты** (отметить)
- [x] Sprint F (новый аудит 24.09.2026): PAT memory-only + legacy cleanup + no analytics на `/admin/`; точный disclosure публичных GitHub Issues; license/verification schema+UI; meta CSP/referrer; skip-link, nav aria, ToS, breadcrumbs list, LCP priority, banners CTA, robots BOM, thin content list, privacy Issues+analytics, trim-валидация форм
- [ ] P0 follow-up: внести официальные license/verification данные (сейчас 0/140) и реквизиты владельца в ToS перед платным контрактом
- [ ] E2E admin hide-flow — PAT создаст пользователь (PAT done)
- [ ] Первый banner/placement request до 15.12.2026
- [ ] Analytics: создать GH Secrets `PUBLIC_PLAUSIBLE_DOMAIN` / `PUBLIC_UMAMI_WEBSITE_ID` (проверка: `gh secret list` пуст)
- [ ] Open: underscore-слаги specialties (5 шт.) — не ренеймить без редиректов (GH Pages)
- [ ] Open: DHD-аудит `thewayofdhd.github.io` — другой сайт, отдельный трекер (не rudoctors)

## Monetization gate (пройден → proceed)
1. Каталог 120–150 + отзывы → баннеры/ads → платящие размещения (или продажа сайта).
2. Денежный сигнал: первый banner/placement request до 15.12.2026.
3. Отложено: UI-фичи без данных (не влияют на деньги); featured-пакеты — вторичны.

## Согласованные ответы
- Порядок: 0→1→2→3→4.
- Перевод: без ключей в репо (GH Secrets).
- Sheets: еженедельный public export.
- PAT: создать позже, Phase 6.
- Telegram: public `t.me/s/` осторожно + ручной импорт визиток из Sheets.
