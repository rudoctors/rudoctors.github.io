# Источники данных

## Активные (в seed / Phase 2)

| Источник | Что даёт | Script | Статус |
|----------|----------|--------|--------|
| `https://rusdoctors.net/api/doctors` | базовые карточки | seed (raw) | ✅ |
| `https://serbia.alfamedstar.com/ru/doctors` | 17 врачей, 64 отзыва на русском языке | `scripts/scrape-alfa.mjs` | ✅ |
| `https://www.medigroup.rs/russkie-vrachi/` | 20 врачей, фото, филиалы, ссылки | `scripts/scrape-medigroup.mjs` | ✅ |
| `https://doctorus.rs/ru` | 9 врачей, ученые степени, запись Altegio | `scripts/scrape-doctorus.mjs` | ✅ |
| `https://citilab.rs/ru/doctors` | 20 врачей, **experienceYears**, фото, booking | `scripts/fetch-citilab.mjs` | ✅ |
| Google Sheets (public CSV) | 109 строк: ФИО, спец., город, контакты, языки, документы | `scripts/fetch-sheet.mjs` | ✅ |
| Telegram Desktop / Telethon (@balkandunav) | >219 471 сообщений → 2021 курированный отзыв | `export-telethon.py` + `match-tg-reviews.mjs` | ✅ |
| `https://rusdoctors.net/api/clinics` | клиники | seed (raw) | ✅ |
| `https://t.me/s/russmedicserbia` | 139 постов → 14 визиток, 2 review_candidate | `scripts/fetch-tg.mjs` | ✅ |

**Итог на 18.11.2026:** 445 карточек (440 публичных, 5 скрытых/редиректов), 2110 отзывов; `npm run detect:dups` → 0; сборка 515 статических страниц.

## Клиники Сербии

- **AlfaMedStar (`https://serbia.alfamedstar.com/`):** Новый динамический парсер достаёт врачей, специализацию, стаж и русскоязычные отзывы пациентов из `class="...text..."`.
- **MediGroup (`https://www.medigroup.rs/russkie-vrachi/`):** Динамический парсер выгружает русскоязычных врачей сети, фото высокого разрешения и адреса отделений.
- **Doctorus Expert (`https://doctorus.rs/ru`):** Парсер выгружает врачей клиники, ученые степени и прямые ссылки на онлайн-запись через платформу Altegio (`doctorus.altegio.me`).
- **Citilab (`https://citilab.rs/ru/doctors/`):** Выгружает врачей, филиалы и стаж работы.
- **Единая команда:** `npm run fetch:clinics` обновляет все клиники за один вызов.

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
