# USER-ACTIONS — что сделать вам (PIVO: Verify)

Работаю без домена (решение 1). Всё, что можно кодом, уже в ветке/локально.
Ниже — шаги, где нужна **ваша авторизация**. После push открою вкладки Search Console / Bing Webmaster в BrowserOS Neo.

---

## A. После деплоя на GitHub (обязательно)

Код нужно запушить в git-репозиторий с GitHub Pages (`rudoctors.github.io`), чтобы Actions пересобрал сайт.

1. Репозиторий: `D:\Projects\rudoctors\site` → remote `https://github.com/rudoctors/rudoctors.github.io.git`, ветка `main`.
2. Push выполнен (коммиты до `44fcbc6`), Actions Deploy — success. Локально `git status` чистый (кроме TIKTOK.md, если ещё не закоммичен).
3. Откройте https://rudoctors.github.io/faq/ — страница должна отдаваться.

---

## B. Google Search Console — **done** (24.09.2026)

- [x] HTML-метатег `google-site-verification` вставлен (токен ротирован: `od8PTNpX…`)
- [x] Право собственности подтверждено («Тег HTML» → ПОДТВЕРДИТЬ)
- [x] Sitemaps → `https://rudoctors.github.io/sitemap-index.xml` → отправлен
- [ ] URL Inspection → индексация главной и 5–10 карточек (7–14 дней)

## C. Bing Webmaster Tools — **done** (24.09.2026)

- [x] `msvalidate.01` вставлен; сайт `rudoctors.github.io` в аккаунте
- [x] Sitemap → `https://rudoctors.github.io/sitemap-index.xml` → Submitted / Processing
- [x] IndexNow: ключ в CI (`74fc6157…`) + key file на проде

## C2. Yandex — мета `yandex-verification` уже в `Layout.astro` (нужен свой домен для Вебмастера)

## D. Яндекс — заблокировано без домена

Вебмастер Яндекса принимает **только собственный домен**.  
`rudoctors.github.io` ≠ допустимый адрес.

**Когда решите купить домен** (рекомендую `.rs` или `.com`):
1. Купить → CNAME на `rudoctors.github.io` (GitHub Pages → Custom domain).
2. Включить Enforce HTTPS.
3. Я.Вебмастер → добавить домен → meta `yandex-verification` (я вставлю) → Sitemap → **регион: Белград** (со ссылкой на `/contacts/`).
4. Яндекс.Метрика → привязка к Вебмастеру → «Обход по счётчику».

Вкладка `https://webmaster.yandex.ru/status/` — откройте сами после покупки домена; сейчас без собственного домена добавить сайт нельзя.

## E. Размещения (спринт 4)

См. `docs/seo-catalogs.md` — таблица площадок. Часть можно делать параллельно:
регистрации в nadjidoktora.rs / ordinacije.rs и т.п. требуют вашей почты.

---

## Чек-лист Verify (через 7-14 дней после деплоя)

- [ ] `site:rudoctors.github.io` в Google — главная в индексе
- [ ] GSC: ошибки Sitemap = 0, «Индекс охвачено» растёт
- [ ] Bing: URL Inspection → Indexed
- [ ] https://rudoctors.github.io/og.png открывается
- [ ] https://rudoctors.github.io/llms.txt открывается
- [ ] FAQ-страница: валидатор https://search.google.com/test/rich-results — FAQPage OK
- [ ] Вручную: ChatGPT/Perplexity «русский врач Белград» → упоминание rudoctors (не гарантировано, проба)
- [ ] Главная показывает 139 врачей / 32 специальности / 4 города
- [ ] sitemap: без leave-review/add-doctor/admin/**packages**
- [ ] og.png и llms.txt отдаются (HTTP 200)

---

## Что уже сделано кодом (сводка)

- og:image/twitter:image, manifest, apple-touch, 404
- /privacy/, /contacts/, /faq/ (FAQPage JSON-LD)
- Organization + BreadcrumbList JSON-LD
- llms.txt, robots.txt с AI-кроулерами
- Интросы на все страницы специальностей и городов
- Фильтр sitemap (без noindex-страниц)
- IndexNow в GitHub Actions (`scripts/indexnow.mjs`)
- Дедуп: Штучный Игорь склеен; oftalmolog → ophthalmologist
- Нейтральный freshness для отзывов без даты (был штраф 3650 дней)
- Страницы: 404 (noindex), /privacy/, /contacts/, /faq/ (12 Q + FAQPage)
- BreadcrumbList на специальностях/городах/карточках врачей; Physician JSON-LD
- Интросы specialty-intros.json / city-intros.json + фолбэк для новых городов (Niš)
- Self-host Manrope (woff2 локально); удалены legacy JPG (53, ~40MB)
- UI без «Рекомендуем»/«Рекомендуемые профили»; `/packages/` noindex + вне sitemap; CTA → баннерная реклама
- Аватарка Е. Курамшиной: используется исходный `rd-59.webp` (180°-вариант удалён)
- Test banners: страховка (home-top, catalog-top) + клиника (home-bottom), метка «Реклама» (`47ab5ac`)
- Verify-меты: GSC + Bing + Yandex в `Layout.astro`
- GSC: verify + sitemap **done** (24.09.2026)
- Bing: сайт + sitemap **done** (24.09.2026)
- PAT / analytics keys — пользователь (done)

## Документы

- `docs/seo-keywords.md` — поисковое ядро (кластеры A–E, KPI)
- `docs/seo-catalogs.md` — каталоги, чаты, шаблон сообщения
- `docs/USER-ACTIONS.md` — этот файл
