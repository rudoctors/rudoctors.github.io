# Rudoctors — состояние проекта (state)

Обновлено: 2026-09-24  
Репозиторий: `https://github.com/rudoctors/rudoctors.github.io` (орг `rudoctors` под аккаунтом TheWayofDHD, ветка `main`)  
Локальная папка: `D:\Projects\rudoctors\site`  
Live: `https://rudoctors.github.io`

---

## Мета

- **Продукт:** русскоязычный каталог врачей в Сербии (рейтинги, отзывы, запись).
- **Стек:** Astro 7.3.4 + TypeScript strict + Tailwind CSS 4; JSON в репо = GitHub CMS; GitHub Actions → GitHub Pages; Node ≥22.12.
- **Монетизация (главная цель):** **баннерная реклама / продажа сайта** (приоритет над featured-пакетами, 24.09.2026); денежный сигнал — первый banner/placement request до **15.12.2026**.
- **Домен:** нет (GitHub Pages, `*.github.io`). Яндекс без своего домена недоступен.

---

## Этапы разработки (Phase 0–6)

| # | Фаза | Статус | Что сделано |
|---|------|--------|-------------|
| 0 | Docs | **done** | PLAN, AUDIT, SOURCES, DECISIONS, OPS, README |
| 1 | CRITICAL fixes | **done** | seed merge-in-place; rating 0 (без фейковых 5); XSS JSON-LD; safeUrl allowlist; PAT sessionStorage+TTL 8h → спринт F memory-only; дубликаты (59 карт); fail-fast JSON; slugify CYR |
| 2 | Данные | **done** | fetch-sheet/citilab/tg → ~140 карт; merge; detect:dups 0 |
| 3 | Отзывы + перевод | **done** | 50 alfa EN; **44 переведены суб-агентом (ИИ)** + 6 already-RU; без API-ключа; UI «оригинал» |
| 4 | Continuous update | **done** | cron Mon/Thu 05:00 UTC; merge-safe seed; strict schema; commit-if-diff |
| 5 | HIGH polish | **done** | og:image; noindex; 404; privacy; FAQ; WebP 53 фото; city slug `novi-sad`; hreflang; aria-live; PR CI; **self-host Manrope**; **JPG удалены** |
| 6 | Монетизация | **done** (кроме PAT) | click-track; analytics hooks; UI без «Рекомендуем»; `/packages/` noindex; CTA → баннеры |

### Хронология коммитов (ключевые)

| Коммит | Описание |
|--------|----------|
| `3b8df20` | Phase 0-4 |
| `a8f8b21` | Phase 5-6 (138 файлов) |
| `9ffbe3d` | docs |
| `6d274e1` | Phase 5 polish: city slug, strict schema, PR CI, aria-live, hreflang, seed prefers webp |
| `44fcbc6` | IndexNow 32-hex key `74fc615772e99cbc3659e76f7f6bb7c0` + USER-ACTIONS |
| `b480b7a` | `docs/TIKTOK.md` (batch 5 сценариев) |
| **`d4c5b91`** | **Удалены 53 JPG (~40MB), self-host Manrope woff2 (6 subset)** — CI success |
| **`5768c16`** | UI без «Рекомендуем»; `/packages/` noindex; fix avatar Курамшина; CTA → баннеры |
| **`335d5f4`** | STATE.md после правок UI/монетизации |
| **`95c7444`** | STATE.md хронология |
| **`50afc6d`** | STATE.md final chronology |
| **`47ab5ac`** | Test banners (insurance/clinic); avatar Курамшина → original `rd-59.webp`; удалён `rd-59-r.webp` |
| **`bdf5931`** | Rename home section Высший рейтинг → Врачи Сербии |
| **`553f0bd`** | Search matches RU specialization labels + specializationText |
| **`3050da7`** | **Спринты A→E** (69 файлов): schema/urls, a11y+formGuard, thin content, D2 pagination, llms/404/OPS — **CI success** `36020752013` |
| **`64dc5bd`** | STATE.md после A→E — CI success `36021269539` |
| **`8defc09`** | **Спринт F:** PAT memory-only + legacy cleanup/no analytics, Issues disclosure, license schema/UI, ToS, meta CSP/referrer, breadcrumbs, LCP priority, CTA banners, robots BOM |

---

## Текущее состояние (спринты A→F, 24.09.2026)

### Верификация
- `npm run check` — 0 errors / 0 warnings / 1 pre-existing hint (`chunkId` в `preprocess-tg-export.mjs`).
- `npm run build` — **189 pages**, sitemap-index.
- dist: packages noindex, sitemap без `/packages`, 0 «Рекомендуем» в HTML.
- Live smoke: `/`, `/doctors/` (+`?page=2` client), `/cities/nis/`, `/llms.txt`, `/404`, forms, doctor profile — **200**; data-bio=0; www.t.me=0; pager present; honeypot present.
- CI `3050da7` → run `36020752013` — **success** (build 21s + deploy 2m13s); IndexNow ping OK.
- CI `8defc09` → run **`36027316904`** — **success** (build 25s + deploy 11s).
- Sprint F live smoke: `/terms/`, CSP/referrer, skip-link, 3× eager/high, breadcrumbs, CTA banners, robots; `/admin/` без analytics и legacy PAT очищает 4/4 storage-ключа; обе формы блокируют whitespace и открывают только предзаполненную GitHub-форму с корректным label.
- Sitemap: no `/packages`, no `/admin`, no forms; sub-sitemaps include `/cities/nis`.

### Verify (пользователь, 24.09.2026)
- GSC: `google-site-verification` в `Layout.astro` — **done**.
- Bing: `msvalidate.01` — **done**.
- Yandex meta: `yandex-verification` в Layout (без своего домена Вебмастер недоступен).
- PAT — **done** (пользователь).
- Analytics keys — **проверено 24.09.2026: `gh secret list` пуст** — GH Secrets **не созданы**; скриптов аналитики в проде нет. Создать `PUBLIC_PLAUSIBLE_DOMAIN` / `PUBLIC_UMAMI_WEBSITE_ID` после выбора провайдера.

### Спринт F (новый аудит rudoctors 24.09.2026)
- Источники: `D:\Projects\rudoctors\AUDIT-REPORT-rudoctors-2026-09-24.md` (+ seomator/ai-native/standards).
- **P0:** PAT memory-only + безусловная очистка legacy storage + analytics отключены на `/admin/`; точный disclosure публичных GitHub Issues + consent/privacy; `LicenseInfo`+`verificationStatus` types + profile UI; meta CSP/referrer; ToS `/terms/` (footer).
- **P1:** skip-link `#main`; nav aria-label; Banner H2; breadcrumbs на doctors/specialties/cities/about; LCP `priority`+`fetchpriority` первые 3 карточки главной/каталога; CTA test banners → «Разместить рекламу»; robots.txt BOM убран; trim-валидация форм; list thin-content; privacy §4 analytics status.
- **check** 0 err / 0 warn / 1 pre-existing hint; **build 189 pages** (вкл. `/terms/`).
- **Частично / open:** license/verification schema+UI готовы, но официальных данных **0/140**; AggregateRating сейчас не публикуется (0 числовых оценок), provenance note появится при их появлении.
- **Платформенный лимит:** XFO/XCTO/CSP `frame-ancestors` не работают через meta; нужны response headers на CDN/другом хостинге.
- **Не делано (осознанно):** underscore-слаги (нет 301 на GH Pages); серверный auth `/admin/`; DHD-аудит — другой сайт `thewayofdhd.github.io`.

### Данные
- **140** карточек врачей (`src/data/doctors/*.json`).
- **50** текстовых отзывов; числовых оценок **0**, поэтому `AggregateRating` сейчас не публикуется.
- License/verification data: **0/140**; UI поддерживает поля, но официальные значения не выдумывались.
- **53** фото WebP (`public/photos/`); **0 JPG**; аватарка Курамшиной — исходный `rd-59.webp` (180°-копия удалена).
- Поле `featured` в schema сохранено (seed OR-merge), но **без UI-бейджей** и без секции на главной.
- Специальности / города: slugified; города belgrade, nis, novi-sad, subotica.

### Монетизация (UI)
- Убраны: бейдж «Рекомендуем» (DoctorCard, [slug]), секция «Рекомендуемые профили» (index).
- `/packages/`: `noindex`, вне sitemap, без публичных ссылок (footer/index/about/contacts/faq).
- CTA: «Баннерная реклама» → `/contacts/?topic=banner`.
- **Test banners**: `src/data/banners.json` + `Banner.astro` — home-top (страховка), home-bottom (клиника), catalog-top (страховка); метка «Реклама»; клики → `Banner Click` в analytics hooks.

### Шрифты (self-host)
- Manrope variable woff2, 6 subset: cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin (~190KB total).
- `@font-face` в `src/styles/global.css`; CDN Google Fonts **убран** из `Layout.astro`.
- Preload: cyrillic + latin.

### SEO / инфраструктура
- hreflang `ru` + `x-default`; canonical; robots noindex для `/admin`, forms, 404.
- IndexNow key: `74fc615772e99cbc3659e76f7f6bb7c0` → `public/{key}.txt`.
- Analytics hooks: `PUBLIC_PLAUSIBLE_DOMAIN`, `PUBLIC_UMAMI_WEBSITE_ID` (env **не заданы**).
- FAQPage JSON-LD, Organization, BreadcrumbList, Physician.
- `llms.txt`, `robots.txt` с AI-кроулерами.
- **GSC verify + sitemap: done** 24.09.2026 (токен `od8PTNpX…`, sitemap-index.xml отправлен).
- **Bing сайт + sitemap: done** 24.09.2026 (Processing; IndexNow CI).

### Docs
- `docs/PLAN.md` — трекер (Phase 0–6 done; open: PAT E2E, analytics key).
- `docs/USER-ACTIONS.md` — шаги пользователя (GSC/Bing, PAT).
- `docs/TIKTOK.md` — 5 сценариев.
- `docs/AUDIT.md`, `DECISIONS.md`, `OPS.md`, `SOURCES.md`, `GROWTH.md`, `seo-catalogs.md`, `seo-keywords.md`.

---

## Открытые задачи (open)

| Задача | Кто | Примечание |
|--------|-----|------------|
| GSC verify + sitemap | **done** 24.09.2026 | «Тег HTML»; sitemap-index.xml |
| Bing sitemap | **done** 24.09.2026 | Processing; IndexNow в CI |
| PAT / analytics | **пользователь** | done ранее |
| Первый banner request | до 15.12.2026 | сигнал монетизации (баннеры / продажа сайта) |
| Домен (.rs / .com) | опционально | нужен для Яндекс.Вебмастера |
| Каталоги Сербии (спринт 4) | **пользователь** | см. `docs/seo-catalogs.md` — нужна почта |
| underscore-слаги (5 спец.) | backlog | не ренеймить без редиректов (GH Pages) |
| License/verification YMYL | backlog | schema/UI готовы; нужны официальные данные, сейчас 0/140 |
| ToS legal requisites | до платного контракта | добавить данные владельца/контакт для договора с рекламодателем |
| DHD audit `thewayofdhd.github.io` | отдельный трекер | `D:\Projects\DHD-Project\...` — не rudoctors |
| E2E admin hide-flow | пользователь | PAT memory-only после спринта F |

---

## Директивы пользователя (соблюдены)

1. Перевод EN→RU — **суб-агентом (ИИ)**, не translate API.
2. Коммитить и пушить — да.
3. Выполнять стадии по порядку.
4. Удалить JPG; self-host Manrope — **сделано** (`d4c5b91`).
5. PAT / ключи / GSC-Bing — **пользователь выполнил** (24.09.2026).
6. Убрать «Рекомендуем»/«Рекомендуемые»; fix аватарка Курамшина; скрыть `/packages/` — **сделано** (`5768c16`).
7. Цель: **баннерная реклама или продажа сайта** (не featured-пакеты).
8. Test banners (страховка + клиника) — **сделано**.
9. Спринты A→E по аудиту (honeypot+cooldown, a11y, thin content, perf D2, P2) — **сделано** (см. PLAN/AUDIT).

---

## Полезные команды

```powershell
# dev (фон)
astro dev --background

# проверка
npm run check
npm run build

# данные
npm run fetch:all
npm run seed
npm run refresh
npm run photos:webp
npm run indexnow

# git
git status
git log --oneline -10
gh run list --limit 5
```

---

## Сводка «где что»

| Ресурс | Путь / URL |
|--------|------------|
| Control site | `D:\Projects\rudoctors\site` |
| GitHub org | `rudoctors` (TheWayofDHD) |
| Repo | `rudoctors/rudoctors.github.io` |
| Pages | `https://rudoctors.github.io` |
| State-файл | `D:\Projects\rudoctors\site\STATE.md` |
| Plan | `docs/PLAN.md` |
| User actions | `docs/USER-ACTIONS.md` |
