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
| 1 | CRITICAL fixes | **done** | seed merge-in-place; rating 0 (без фейковых 5); XSS JSON-LD; safeUrl allowlist; PAT sessionStorage+TTL 8h; дубликаты (59 карт); fail-fast JSON; slugify CYR |
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

---

## Текущее состояние (после `50afc6d` + test banners)

### Верификация
- `npm run check` — 0 errors / 0 warnings.
- `npm run build` — **188 pages**, sitemap-index.
- dist: packages noindex, sitemap без `/packages`, 0 «Рекомендуем» в HTML.
- Live smoke: `/`, `/cities/novi-sad/`, `/faq/`, `/doctors/...` — 200 (`/packages/` — noindex).
- CI: build + deploy Pages — **success**.
- IndexNow CI ping — 202 OK (~184 URLs).

### Verify (пользователь, 24.09.2026)
- GSC: `google-site-verification` в `Layout.astro` — **done**.
- Bing: `msvalidate.01` — **done**.
- Yandex meta: `yandex-verification` в Layout (без своего домена Вебмастер недоступен).
- PAT — **done** (пользователь).
- Analytics keys — **done** (пользователь, GH Secrets).

### Данные
- **140** карточек врачей (`src/data/doctors/*.json`).
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

### Docs
- `docs/PLAN.md` — трекер (Phase 0–6 done; open: PAT E2E, analytics key).
- `docs/USER-ACTIONS.md` — шаги пользователя (GSC/Bing, PAT).
- `docs/TIKTOK.md` — 5 сценариев.
- `docs/AUDIT.md`, `DECISIONS.md`, `OPS.md`, `SOURCES.md`, `GROWTH.md`, `seo-catalogs.md`, `seo-keywords.md`.

---

## Открытые задачи (open)

| Задача | Кто | Примечание |
|--------|-----|------------|
| GSC verify + sitemap | **done** 24.09.2026 | verify «Тег HTML»; sitemap-index.xml отправлен; токен `od8PTNpX…` |
| Bing Webmaster sitemap | **done** 24.09.2026 | сайт в аккаунте; sitemap Processing; IndexNow в CI |
| PAT (fine-grained contents RW) | **пользователь** | E2E admin hide-flow после создания |
| Analytics keys (Plausible/Umami) | **пользователь** | env в GH Secrets / Actions |
| Первый banner request | до 15.12.2026 | сигнал монетизации (баннеры / продажа сайта) |
| Домен (.rs / .com) | опционально | нужен для Яндекс.Вебмастера |
| Каталоги Сербии (спринт 4) | **пользователь** | см. `docs/seo-catalogs.md` — нужна почта |

---

## Директивы пользователя (соблюдены)

1. Перевод EN→RU — **суб-агентом (ИИ)**, не translate API.
2. Коммитить и пушить — да.
3. Выполнять стадии по порядку.
4. Удалить JPG; self-host Manrope — **сделано** (`d4c5b91`).
5. PAT / ключи / GSC-Bing — пользователь сам, позже.
6. Убрать «Рекомендуем»/«Рекомендуемые»; fix аватарка Курамшина; скрыть `/packages/` — **сделано** (`5768c16`).
7. Цель: **баннерная реклама или продажа сайта** (не featured-пакеты).

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
