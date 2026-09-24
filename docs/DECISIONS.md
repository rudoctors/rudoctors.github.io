# Ключевые решения

| Дата | Решение | Обоснование |
|------|---------|-------------|
| 2026-09-23 | Порядок фаз 0→1→2→3→4 | Сначала docs + CRITICAL, потом данные, отзывы, continuous |
| 2026-09-23 | Перевод EN→RU через mimo/opencode + GH Secrets | Без секретов/ключей в репо |
| 2026-09-23 | Sheets public CSV weekly | Публичный export, без API-ключа |
| 2026-09-23 | PAT — только Phase 6 | Fine-grained contents RW; E2E admin позже |
| 2026-09-23 | TG: public `t.me/s/` + ручной импорт визиток из Sheets | ToS-риск; preview ненадёжен для некоторых каналов |
| 2026-09-23 | Seed: merge-in-place, приоритет manual/sheets > citilab > tme > alfa > rusdoctors | Сохранять админ-правки; свежие источники важнее |
| 2026-09-23 | Отзывы без hardcode rating=5 | Bayesian rating не накручивать |
| 2026-09-23 | Raw JSON: CI fetch, не коммитить | Репо не раздувать; воспроизводимость через fetch-скрипты |
| 2026-09-23 | Monetization gate: proceed | Каталог+отзывы → featured/ads 30–90 дней; сигнал 15.12.2026 |
| 2026-09-23 | Phase 2 done: 143 карты (sheets 106 + citilab 19 + TG cards) | Цель 120–150 достигнута; fuzzy-merge дублей |
| 2026-09-23 | Cron Mon/Thu 05:00 UTC, commit только по schedule | Нет пуш-циклов; raw intermediates не в git |
| 2026-09-23 | Перевод: TRANSLATE_API_KEY в GH Secrets, no-op без ключа | Без секретов в репо |
| 2026-09-24 | Перевод EN→RU делает суб-агент (ИИ), не translate API | Директива пользователя; без ключей |
| 2026-09-24 | Phase 5 done: og, 404/privacy/contacts/faq, WebP photos | High polish до монетизации |
| 2026-09-24 | Phase 6: `/packages/` + featured demo 2 карточки + click-track | Продукт видим для первого request |
| 2026-09-24 | Analytics: optional Plausible/Umami через PUBLIC_* env | Без секретов в репо; hooks готовы |
| 2026-09-24 | City slug `novi-sad` + hreflang ru/x-default + PR CI без deploy | SEO + безопасный PR check |
| 2026-09-24 | Strict schema в loadDoctors; seed prefers `.webp` | Fail-fast data; не откатывать photo на JPG |
| 2026-09-24 | TG review_candidates (2) — без имени врача, не импортировать | Без фейковых привязок к карточкам |
| 2026-09-24 | Self-host Manrope (6 subset woff2 в public/fonts); удалены 53 legacy JPG | Без Google Fonts CDN/трекинга; репо ~40MB легче |
| 2026-09-24 | Убраны бейджи «Рекомендуем» и секция «Рекомендуемые профили»; `/packages/` noindex + вне sitemap и навигации; CTA → баннерная реклама | Директива: основная цель — баннеры / продажа сайта, не featured-пакеты |

## Технический стек (подтверждён)
Astro 7 + TS strict + Tailwind 4; JSON в репо = GitHub CMS; Actions → Pages (`build_type=workflow`); Node ≥22.12.
