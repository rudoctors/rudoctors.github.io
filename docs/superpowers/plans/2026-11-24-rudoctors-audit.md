# Комплексный сквозной аудит сайта RuDoctors (TSK-RD-19 / TASK-DOC-005)

> **Статус**: План согласован (Grill-Me завершён), готов к выполнению  
> **Целевой домен**: `https://rudoctors.com` (Production) и зеркало `https://rudoctors.rs`  
> **Инструменты контроля**: MCP `browseros-neo`, Node.js тестовые раннеры, Astro compiler, Schema.org linter, Git-пайплайн  
> **Стандарты**: `D:\AGENTS.md` (Web Production & SEO Standard), Google Core Web Vitals, Schema.org, Security Standard  

---

## 1. Goal Description

Провести исчерпывающий сквозной аудит веб-ресурса **RuDoctors** (`https://rudoctors.com`), охватывающий:
1. **Визуальный и версточный контроль в реальном браузере** через MCP `browseros-neo` на десктопных (1280x800) и мобильных (390x844) разрешениях для всех ключевых узлов: Главная (`/`), Каталог (`/doctors/`), Города (`/cities/belgrade/`, `/cities/novi-sad/`), Кластеры горячего спроса (`/cities/belgrade/gynecologist/`, `/cities/belgrade/pediatrician/` и др.), Интерактивная карта клиник (`/map/`), Гайды (`/guides/`), страница 404 (`/404/`).
2. **Аудит интерактивности и форм**:
   - Сквозной поиск, фильтрация (города, специальности, форматы приёма, категория 🇷🇸), пагинация, раскрытие аккордеонов FAQ.
   - Интерактивная карта клиник (`/map/`): рендеринг Leaflet, переключение категорий, поиск по районам, балуны клиник.
   - Форма отзыва `/leave-review/`: валидация полей, Google Apps Script Webhook, Turnstile, honeypot, отправка реального тестового отзыва `[ТЕСТ АУДИТА: УДАЛИТЬ]`, аварийный Telegram-фоллбэк, автосохранение черновика.
   - Форма добавления врача `/add-doctor/`: валидация, структура данных, буфер обмена, шеринг в Telegram, ссылка на GitHub Issue.
3. **Технический и SEO-контроль (Web Production Standard)**:
   - Контроль веса всех сгенерированных HTML-файлов (< 150 Кб).
   - Валидация микроразметки Schema.org (`Organization`, `WebSite`, `BreadcrumbList`, `MedicalWebPage`, `Physician`, `FAQPage`, `ItemList`, `CollectionPage`).
   - Проверка консоли браузера на 0 ошибок JS и соответствие CSP (Яндекс.Метрика `114195788`, GA4 `G-GYCMGV50RJ`, Cloudflare Turnstile, Leaflet OSM).
   - Проверка служебных файлов: `robots.txt` (AI-краулеры), `llms.txt`, `llms-full.txt`, `sitemap-index.xml`.
   - Проверка 30+ SEO-редиректов (алиасы `uzi`, `stomatolog`, `pediatr` и др.) и 301-зеркала домена `https://rudoctors.rs`.
   - Автоматический краулер на битые внутренние ссылки (0 broken links).
   - Проверка безопасности и изоляции `/admin/` (noindex, noAnalytics, очистка токена PAT в памяти).
4. **Немедленная ремедиация и деплой**:
   - Внедрение пагинации по 24 карточки в `src/pages/specialties/[key].astro` для устранения перегрузки DOM (`specialties/therapist` с 953 Кб до < 100 Кб).
   - Авто-коммит и push в `main` для деплоя на GitHub Pages.
   - Внедрение постоянного скрипта CI-валидации `site/scripts/validate-build.mjs`.

---

## 2. Agreed Parameters & Decisions

1. **Тестовая отправка отзыва**: Отправляем один реальный отзыв с автором `[ТЕСТ АУДИТА]` и текстом `[ТЕСТ АУДИТА: УДАЛИТЬ — проверка сквозного вебхука при комплексном аудите сайта RuDoctors 24.11.2026]` для валидации связки Form -> Google Apps Script Webhook -> CRM Google Sheets -> Telegram-канал модерации.
2. **Расширенный охват**: В программу включены 30+ SEO-редиректов, 404 страница, изоляция `/admin/`, проверка 301-зеркала `rudoctors.rs` и внутренний краулинг ссылок.
3. **Ремедиация и деплой**: Правка пагинации `specialties/[key].astro` коммитится и пушится в `main`, чтобы финальный аудит BrowserOS Neo проходил на обновленном живом проде.
4. **Автоматизация**: Создается постоянный скрипт `scripts/validate-build.mjs` и команда `npm run test:audit`.

---

## 3. Implementation Workflow

### Этап 1: Ремедиация страниц специальностей (`src/pages/specialties/[key].astro`)
### Этап 2: Сборка, проверка и автодеплой в `main`
### Этап 3: Создание постоянного скрипта валидации `site/scripts/validate-build.mjs`
### Этап 4: Технический и SEO-контроль
### Этап 5: Краулинг внутренних ссылок
### Этап 6: Визуальный аудит в BrowserOS Neo (Desktop + Mobile)
### Этап 7: Аудит интерактивности, поиска, фильтрации и карты
### Этап 8: Аудит форм и сценариев
### Этап 9: Аудит безопасности `/admin/`, консоли JS и политик CSP
### Этап 10: Сводный отчет, закрытие задач и запись в Obsidian

---

## 4. Verification Commands

```powershell
npm --prefix site run check
npm --prefix site run build
npm --prefix site run test:audit
git -C site status
```
