# Инструкции проекта RuDoctors

Применять `D:\AGENTS.md`.

## Регламент разработки и стандарты качества RuDoctors

1. **Быстрая доставка и публикация в Git:**
   - Все проверенные изменения сразу пушить в ветку `main` (`git push origin main`). GitHub Actions автоматически собирает проект и деплоит на GitHub Pages (`rudoctors.com`).
   - Локально в фоне (`astro dev --background`) проверять только сырые гипотезы и сложные правки компонентов.
2. **SEO, GEO (Generative Engine Optimization) и Local SEO (Сербия):**
   - **GEO (Generative Engine Optimization):** открытость для AI-поисковиков (`GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`). Поддержка `llms.txt` и `llms-full.txt` с актуальной структурой разделов (национальные сербские врачи с лицензиями LKS, медицинские гайды, правила цитирования).
   - **Local SEO (гео-привязка):** все города обязательно сопровождаются русской локализацией в `site/src/lib/site.ts` (`CITY_LABELS_RU`) и `site/src/pages/doctors/index.astro` (`CITY_LABELS`). Запрещено выводить города в сыром виде или оставлять без русского названия.
   - Мета-тег `<title>` форматируется через `Layout.astro` без задвоения бренда `RuDoctors` (запрещено `... | RuDoctors · Rudoctors`).
   - Микроразметка Schema.org: обязательна на всех типовых страницах (`CollectionPage`, `ItemList`, `Physician`, `MedicalWebPage`, `FAQPage`, `BreadcrumbList`).
3. **Аналитика, верификация и безопасность (CSP):**
   - Поддерживать активными счетчики: Яндекс.Метрика (`mc.yandex.ru`), Google Analytics / GTM, Plausible, Umami.
   - Мета-теги поисковой верификации: Google, Yandex (два тега), Bing/MS, Mitgo.
   - Политика CSP в `Layout.astro` обязана разрешать скрипты аналитики, Cloudflare Turnstile, Deno relay (`rudoctors-relay.deno.dev`) и внешние фото.
4. **Обязательная индексация после релизов:**
   - Пайплайн GitHub Actions автоматически запускает `scripts/indexnow.mjs` (пинг Яндекс и Bing при каждом деплое).
   - При добавлении новых разделов или существенном обновлении базы врачей: проверять и отправлять `sitemap-index.xml` и `sitemap-0.xml` в Google Search Console и Яндекс.Вебмастер через BrowserOS Neo, а также запрашивать приоритетный переобход ключевых URL (URL Inspection -> Request Indexing).
5. **Визуальный контроль в браузере (BrowserOS Neo):**
   - После деплоя всегда визуально проверять измененные страницы через MCP `browseros-neo`:
     - Проверять верстку карточек, фильтры, поиск, пагинатор, мобильный вид.
     - Убеждаться в отсутствии сдвигов и наплывов блоков.
6. **Human-First контент (Категорический запрет «технарщины»):**
   - **Не писать технические штуки на сайте:** запрещено выводить в интерфейс и метаданные технические идентификаторы, имена таблиц, фрагменты парсеров (`venac`, `grad`, `lks:123`, `split('-')`, `undefined`, `null`).
   - Имена врачей сохраняются на сербской латинице (как в документах и на вывесках клиник), а специальности, стаж, клиники и отзывы обязательно переводятся на русский язык с возможностью просмотра сербского оригинала.
7. **Синхронизация клиента и сервера:**
   - Клиентская функция `cardHtml` в `/doctors/index.astro` обязана полностью повторять серверный рендер `DoctorCard.astro`: отображать бейдж сербского врача 🇷🇸, верифицированный номер лицензии LKS (`Лицензия LKS №...`) и локализованный город. При поиске и фильтрации данные не должны исчезать.
8. **Производительность и вес DOM:**
   - Вес любой сгенерированной HTML-страницы каталога должен быть **< 150 Кб**.
   - На страницах категорий и хабов (например, `/doctors/serbian/`) рендерить первые 24–36 карточек, сопровождая ссылкой на полный интерактивный каталог `/doctors/?origin=rs` со сквозными фильтрами. Запрещено рендерить 1 000+ карточек в одном DOM.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
