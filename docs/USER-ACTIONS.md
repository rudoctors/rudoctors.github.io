# USER-ACTIONS — что сделать вам (PIVO: Verify)

Работаю без домена (решение 1). Всё, что можно кодом, уже в ветке/локально.
Ниже — шаги, где нужна **ваша авторизация**. После push открою вкладки Search Console / Bing Webmaster в BrowserOS Neo.

---

## A. После деплоя на GitHub (обязательно)

Код нужно запушить в git-репозиторий с GitHub Pages (`rudoctors.github.io`), чтобы Actions пересобрал сайт.

1. Репозиторий: `D:\Projects\rudoctors\site` → remote `https://github.com/rudoctors/rudoctors.github.io.git`, ветка `main`.
2. Push выполнен (коммит `6d274e1`), Actions Deploy — success. Локально `git status` чистый.
3. Откройте https://rudoctors.github.io/faq/ — страница должна отдаваться.

---

## B. Google Search Console (~10 минут)

**Вкладка:** Search Console (открою в Neo)

0. Откройте https://search.google.com/search-console (или вкладка из BrowserOS)
1. **Добавить свойство** → тип **URL-префикс** → `https://rudoctors.github.io/`
2. Способ верификации: **HTML-метатег** → скопируйте строку  
   `<meta name="google-site-verification" content="XXXXXXXX">`
3. Скиньте мне метатег в чат (или вставьте сами) — я добавлю его в `Layout.astro` и вы запушите.  
   *Альтернатива без правки кода:* «Проверка через файл» → скачанный HTML-файл кладите в `site/public/`, скажите путь — я скопирую и добавлю в билд.
4. После Verify → **Sitemaps** → `https://rudoctors.github.io/sitemap-index.xml` → Отправить.
5. **URL Inspection** → запросить индексацию главной и 5-10 карточек (kirill-kozyrev, polina-sokolova, pavel-borisov и др.).

**Что я сделаю после вашего «метатег получен»:** вставлю в `Layout.astro` → `googleSiteVerification`, пересоберу, вы запушите, затем GSC → Verify.

## C. Bing Webmaster Tools (~10 минут)

**Вкладка:** Bing Webmaster (открою в Neo)

0. Откройте https://www.bing.com/webmasters
1. **Добавить сайт** → URL `https://rudoctors.github.io/`
2. Проще: **Import from Google Search Console** (если B уже готово) — подтянет sitemap.
3. Либо вручную: HTML-метатег аналогично Google → я вставлю в Layout.
4. **IndexNow:** в CI уже пинг после сборки. Ключ в `public/{32hex}.txt` (файл на сайте `https://rudoctors.github.io/{key}.txt`) — в Bing Webmaster → IndexNow указать этот host+key (или оставить авто-ping из Actions).

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
- [ ] sitemap: 183 URL, без leave-review/add-doctor
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

## Документы

- `docs/seo-keywords.md` — поисковое ядро (кластеры A–E, KPI)
- `docs/seo-catalogs.md` — каталоги, чаты, шаблон сообщения
- `docs/USER-ACTIONS.md` — этот файл
