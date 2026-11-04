# SEO: remediation производительности каталога `/doctors/` (2026-11-03)

Ветка: `agent/catalog-performance-remediation-2026-11-03` (worktree `catalog-performance-remediation`).
Изменения не merged, не pushed, не deployed.

## Что проверено (baseline)

| Метрика | Live (`rudoctors.github.io`) | Локальный `dist` (до) |
|---|---|---|
| HTTP статус `/doctors/` | 200 | 200 |
| Размер HTML | 1 019 261 B | 1 009 145 B (gzip 92 750 B) |
| Карточек `doctor-item` в initial HTML | 433 | 428 |
| Узлов DOM (seomator-аудит) | 3 245 (рекомендация < 800) | — |
| `sitemap-0.xml` | — | 487 `<loc>` (байт-в-байт сохранён после изменений) |

- Распределение страницы (до): grid/items ≈ 97 % HTML; `data-search` ≈ 44 КБ; био ≈ 86 КБ; SVG ≈ 103 КБ.
- Разница live 433 vs локально 428 — в данных деплоя против репозитория (в репозитории 5 врачей имеют флаг `hidden`, отфильтровываемый `publicDoctors()`), к данному изменению не относится.
- Канонический trailing slash: `/doctors/` → 200, canonical `https://rudoctors.github.io/doctors/` — OK; `/doctors` → 301 → `/doctors/` — OK; `?page=2` → 200, canonical без query — дублей query-страниц нет.
- `npm ci`: 294 пакета. `npm run check` (до): 0 ошибок / 0 предупреждений / 1 hint (`add-doctor.astro:276`, существовавший ранее). `npm run build` (до): 492 страницы.

## Подтверждённые дефекты

1. **Основной:** `/doctors/` отдаёт ~1 МБ статического HTML со всеми 428–433 карточками; пагинация/фильтры — только на клиенте. Initial DOM раздут (seomator: 3 245 узлов), LCP/TBT страдают.
2. **Каноники redirect-страниц:** 4 redirect-страницы (`prahov-aleksey`, `yanik-elena`, `pozharickaya-elena`, `shtuchnyy-igor`) имели canonical **без** trailing slash (`…/doctors/aleksej-pravov`), тогда как целевая страница — со slash (`…/aleksej-pravov/`). Подтверждено и на live, и в `dist`.
3. **Найден в ходе remediation (существовал и в оригинальном коде):** кнопка «Сбросить» не работала — `<button id="reset">` внутри `<form id="filters">` попадает в именованные свойства формы и затеняет нативный `form.reset` → `TypeError: h.reset is not a function` в консоли live-версии.

## Исправления

### 1. `astro.config.mjs` — trailing slash в 4 redirect-целях
`/doctors/aleksej-pravov/`, `/doctors/elena-ianik/`, `/doctors/elena-pozharickaya/`, `/doctors/igor-shtuchnyy/`. После сборки canonical всех 4 redirect-страниц совпадает с целевыми (со slash).

### 2. `src/pages/doctors\index.astro` — переработка каталога
- **Статический HTML:** первые 24 карточки (порядок серверной сортировки «по рейтингу», затем по отзывам — совпадает с клиентским default), статический текст `#result-meta`, пагинация/пустое состояние без изменений по разметке.
- **JSON-островок** `<script type="application/json" id="catalog-data">`: все 428 записей короткими ключами (`s,n,c,sp,f,l,rv,cn,ra` + опц. `e,ne,d,st,p,b`), био обрезано до 160 символов, `<` экранирован `\u003c`. ≈ 113,6 КБ.
- **Клиентский JS** строит все состояния (страницы/фильтры/сортировка/поиск) из островка; `renderedState` инициализируется под default-состояние, поэтому при обычной загрузке статический DOM не перерисовывается (нет «мигания»).
- **Статическая индексируемость профилей:** свёрнутый `<details id="all-doctors">` со ссылками на **все 428** профилей (плюс 48 ссылок в сетке) — полный link equity/краулинг профилей сохранён.
- **`<noscript>`** с сообщением о включённом JS (список профилей в `<details>` доступен и без JS).
- **URL-state:** `q, spec, city, sort, online, withReviews, page` восстанавливаются при заходе по ссылке и пишутся через `history.replaceState` — новых краулящихся URL не создаётся, sitemap не меняется. Поведение `?sort=rating` в URL при загрузке сохранено как в оригинале.
- **Баг reset исправлен:** `id="reset"` → `id="reset-filters"` (устранено затенение `form.reset`).
- **Типизация:** после guard-проверок — типизированные копии элементов (`const grid: HTMLElement = …` и т.д.), чтобы вложенные замыкания `apply()` видели non-null типы.

## Изменённые файлы

- `astro.config.mjs` — 4 цели редиректа (+ trailing slash).
- `src/pages/doctors/index.astro` — переработка (git diff: 2 файла, 427 вставок / 196 удалений).

## Результаты (после)

| Метрика | До (local) | После | Δ |
|---|---|---|---|
| HTML `/doctors/` | 1 009 145 B | 297 776 B | **−70,5 %** (vs live −70,8 %) |
| gzip | 92 750 B | 55 589 B | **−40,1 %** |
| Карточек в initial HTML | 428 | 24 | −94 % |
| Узлов DOM | 3 245 (seomator, live) | 1 599 | **−50,7 %** |
| Ссылок на профили в HTML | 428 (в сетке) | 428 (details) + 48 (сетка) | сохранено |
| `sitemap-0.xml` | 487 `<loc>` | 487 `<loc>`, байт-в-байт идентичен | без изменений |
| Redirect canonicals | 4 из 4 без slash | 4 из 4 со slash | исправлено |
| `npm run build` | 492 страниц | 492 страниц | без изменений |
| `npm run check` | 0 err / 0 warn / 1 hint | 0 err / 0 warn / 1 hint | без регрессий |

## Тесты

- `npm ci` → OK (294 пакета); `npm run check` → 0 ошибок; `npm run build` → 492 страниц.
- Ручной smoke в `npm run preview` (BrowserOS neo):
  - initial: 24 карточки, «Всего: 428 · страница 1 из 18 (по 24)», pager «Страница 1 / 18»;
  - pager вперёд/назад: 1→2→3→2, карточки меняются, URL `?sort=rating&page=N`, title «Каталог врачей — страница N», disabled-состояния кнопок корректны;
  - фильтр city=Belgrade → 322, +«Есть отзывы» → 234, поиск «стоматолог» → 54, сортировка по имени → по алфавиту;
  - «Сбросить» → 24 карточки / «Всего: 428» / форма очищена / URL `?sort=rating` (после фикса);
  - прямые заходы: `?page=3` ✓; `?q&city&sort&withReviews` ✓; `?q=zzzzznotfound` → пустое состояние ✓; `?spec=obstetrician_gynecologist` → 8 ✓; `?online=1` → 67 ✓; `?sort=reviews&page=2` ✓;
  - консоль свежей вкладки после полного цикла взаимодействий: «no console errors or warnings».

## Блокеры

Нет. Ограничения задачи соблюдены: без merge/push/deploy.

## Доказательства

- Baseline-артефакты: `%TEMP%\opencode\catalog-baseline\` (`doctors-index-before.html`, `sitemap-0-before.xml`, `redirect-before.html`).
- После: `dist/doctors/index.html` (297 776 B), `dist/sitemap-0.xml` (487 `<loc>`), `dist/doctors/{prahov-aleksey,yanik-elena,pozharickaya-elena,shtuchnyy-igor}/index.html` (canonical со slash), `dist` — 492 страницы.

## Следующие шаги

1. Merge ветки и деплой (отдельно, по указанию).
2. Пост-деплойная проверка live: размер `/doctors/`, 24 карточки в initial HTML, canonical 4 redirect-страниц, `?spec=`/`?page=` restore.
3. Опционально: повторный прогон seomator (ожидаем DOM ≈ 1 600 узлов вместо 3 245).
