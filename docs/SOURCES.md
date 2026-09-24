# Источники данных

## Активные (в seed / Phase 2)

| Источник | Что даёт | Script | Статус |
|----------|----------|--------|--------|
| `https://rusdoctors.net/api/doctors` | базовые карточки | seed (raw) | ✅ |
| `https://serbia.alfamedstar.com/en/doctors/{slug}` | 14 врачей, 50 отзывов (EN, `lang=en`) | `scripts/scrape-alfa.mjs` | ✅ |
| `https://rusdoctors.net/api/clinics` | клиники | seed (raw) | ✅ |
| Google Sheets (public CSV) | 106 врачей: ФИО, спец., город, контакты, языки, документы | `scripts/fetch-sheet.mjs` | ✅ |
| `https://citilab.rs/ru/doctors` | 19 врачей, **experienceYears**, фото, booking | `scripts/fetch-citilab.mjs` | ✅ |
| `https://t.me/s/russmedicserbia` | 139 постов → 14 визиток, 2 review_candidate | `scripts/fetch-tg.mjs` | ✅ (карточки; отзывы N/A — без имени врача) |
| `t.me/vrachivserbii` | таблица врачей (источник Sheets) | via Sheets | ✅ |
| Telegram Desktop export `ChatExport_2026-09-24` | 151 898 сообщений → 6 451 doctor-oriented → 279 новых карточек, 220 курированных отзывов | `scripts/preprocess-tg-export.mjs` + `scripts/import-tg-cards.mjs` | ✅ |

**Итог после импорта 24.09.2026:** 419 JSON-карточек, 415 публичных; 4 скрыты как подтверждённые архивные дубли; `npm run detect:dups` → 0.
Фото: `npm run photos:webp` → 53 WebP (~40MB JPG → ~1MB webp в репо ссылок).

## Google Sheets

- URL: `https://docs.google.com/spreadsheets/d/1Bh4IdM-L6_18-LAIPMk3Cs-wVko7BamVw9mMm3dKU_Q/edit`
- CSV: `/export?format=csv` (публичный, без ключа)
- Колонки: Раздел, ФИО, Специальность, Город, Контакты, Знание языков, Документы
- Кредиты: `@diana_volchenskaya` / `@Iskatelev` / `@vrachivserbii` — не трогать атрибуцию
- Согласовано: еженедельный pull

## Telegram

- Public web preview: `t.me/s/<channel>` — HTML-посты.
- Осторожно: scraping может нарушать ToS; без spoof UA; rate-limit; только public.
- Ручной импорт визиток из Sheets — приоритет на Phase 2.
- `t.me/s/vrachivserbii` — 0 сообщений через preview → использовать CSV или Telegram Desktop export.
- Полный экспорт: `D:\Data\Downloads\Telegram Desktop\ChatExport_2026-09-24\result.json`; сырой файл и промежуточные `scripts/tg-parsed/` не коммитятся.
- Визитки и рекомендации проверяются по исходным сообщениям; 18 неподтверждённых кандидатов оставлены вне импорта.
- Отзывы публикуются только после курирования: без выдуманных рейтингов, с автором/датой/source URL при наличии.

## Backlog
`rslive.ru`, `lifesserbia.ru`, `doctorus.rs` и др. клиники — enrichment, когда закроются Phase 0–4.

## Правила
- Без фейковых отзывов; рейтинг не hardcode.
- Контакты только публичные; дисклеймер «не заменяет приём врача».
- Имя сайта: `rudoctors`.
