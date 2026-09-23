# Эксплуатация

## Локально

```bash
npm ci
npm run seed      # пересобрать JSON из raw/скрейпов
npm run check     # astro check (типы)
npm run build     # dist/
npm run preview
astro dev --background   # dev (см. AGENTS.md)
```

## Deploy

- Push в `main` → `.github/workflows/deploy.yml` → check → build → GitHub Pages.
- `build_type=workflow`; site: `https://rudoctors.github.io`.
- Проверка: 13 роутов 200, mojibake 0, sitemap без `/admin/`.

## Continuous update (Phase 4)

- Cron: Mon/Thu 05:00 UTC (`deploy.yml` `schedule:`) → fetch sheet+citilab → seed merge → tag en → (translate if `TRANSLATE_API_KEY`) → check → build → commit if diff → Pages.
- Commit только при `schedule` (не на push) — нет циклов.
- Merge-safe: seed не затирает hidden/featured/ручные reviews; fuzzy name match в `findExisting`.
- Raw intermediates (`scripts/sheet-doctors.json`, `citilab-doctors.json`, `tg-posts.json`, `*-raw.json`) — `.gitignore`, CI refetch.
- Локально: `npm run refresh` (fetch+seed+tag+check).

## Админка

- `/admin` + GitHub Contents API; PAT (fine-grained, contents RW) — в браузере.
- Phase 1: sessionStorage + TTL + logout (не localStorage).
- PAT создаёт пользователь перед Phase 6 (E2E hide-flow).

## Секреты / GitHub Actions

- Перевод EN→RU: основной путь — ИИ-агент (сессия); `TRANSLATE_API_KEY` — запасной no-op без ключа.
- Analytics (опционально): build-time `PUBLIC_PLAUSIBLE_DOMAIN` и/или `PUBLIC_UMAMI_WEBSITE_ID`.
- Local: `.env` локально; не коммитить, не печатать, не в память.
- Photos: `npm run photos:webp` (sharp) → `photo: /photos/*.webp`.

## Монетизация

- `/packages/` — featured / клиника / баннер (ориентиры EUR).
- Featured demo: 2 карточки `featured: true`; seed сохраняет OR-merge.
- Clicks: `Appointment Click`, `Outbound Click` → Plausible/Umami hooks (`src/lib/analytics.ts`).
- Сигнал: первый featured request до 15.12.2026; PAT E2E — после создания PAT.

## Мониторинг

- Live smoke: `scripts/verify-live.mjs`, `scripts/verify-home.mjs` (local dist/preview).
- После каждого seed: `npm run check && npm run build`.
- Цель данных: 120–150 врачей — **140 карт** (Phase 2 done).

## Docs

- `PLAN.md` — статус фаз (главный трекер).
- `AUDIT.md`, `SOURCES.md`, `DECISIONS.md`, `OPS.md`.
