# Отчёт: SEO/GEO/UI remediation городов — 2026-11-03

## Проверено
- Ветка: `agent/geo-ui-remediation-2026-11-03`, рабочее дерево чистое до правок.
- Прочитаны `README.md`, `STATE.md`, `TODO.md`, документация в `docs/`, `git status`.
- Проверены страницы городов, каталога, карточек врачей, главной, FAQ, about, специальностей, 404 и JSON-LD.
- Выявлены реальные города в данных: `Belgrade`, `Novi Sad`, `Niš`, `Pančevo`, `Subotica` (323 + 105 + 3 + 1 + 1 карточек).
- Проверена каноническая маршрутизация: `citySlug()` даёт стабильные slug (`belgrade`, `novi-sad`, `nis`, `pancevo`, `subotica`).

## Подтверждено
- Русский UI показывал английские/транслитерированные city labels (`Belgrade`, `Novi Sad`, `Niš`, `Pančevo`, `Subotica`) вместо русских названий.
- Слаги и legacy-ссылки менять не нужно: они уже канонические и используются в sitemap/внутренних ссылках.
- В данных `city` остаётся каноническим английским ключом; это сохраняет фильтры, JSON и совместимость.
- Страница города имела Serbia-контекст в description, но не имела отдельного city JSON-LD и локализованного H1/title.
- FAQ/about не упоминали `Панчево`, хотя в каталоге есть реальная карточка.

## Дефекты
1. Английские city labels в русском UI.
2. Нелокализованные заголовки/хлебные крошки/навигация на страницах городов.
3. Отсутствие city-specific JSON-LD с явной привязкой к Сербии.
4. Слабые внутренние ссылки из профиля врача на страницу города.
5. Неполный список реальных городов в FAQ/about (`Панчево` отсутствовал).

## Исправления
- Добавлен безопасный `cityLabel()` в `src/lib/site.ts`: локализует только 5 реальных городов из данных, остальные значения проходят без изменений.
- В UI заменены прямые `doctor.city`/`c.city` на `cityLabel(...)` для карточек, каталога, индекса городов, главной, 404, профиля, специальностей.
- Канонические slug и значение `city` в данных сохранены; фильтры и URL не изменились.
- На странице города добавлен `CollectionPage` JSON-LD с `about.City` и `containedInPlace.Country = Сербия`.
- В профиле врача город стал ссылкой на соответствующую страницу города.
- FAQ и about дополнены `Панчевом`; FAQ исправлены английские city labels.
- В каталоге поиск теперь учитывает русское название города.

## Файлы
- `src/lib/site.ts`
- `src/components/DoctorCard.astro`
- `src/pages/cities/index.astro`
- `src/pages/cities/[city].astro`
- `src/pages/doctors/index.astro`
- `src/pages/doctors/[slug].astro`
- `src/pages/index.astro`
- `src/pages/404.astro`
- `src/pages/specialties/[key].astro`
- `src/pages/faq.astro`
- `src/pages/about.astro`

## Тесты
- `npm run check` — успешно: 0 errors, 0 warnings, 1 pre-existing hint.
- `npm run build` — успешно: 492 страниц, sitemap-index создан.
- Проверен HTML `/cities/belgrade/`: title `Врачи в Белград, Сербия · Rudoctors`, JSON-LD `CollectionPage` + `BreadcrumbList`, city label `Белград`.
- Проверены city links в `/cities/belgrade/` и профилях врачей.

## Блокеры
- Отсутствуют. Зависимости установлены через `npm ci`; уязвимости npm не относятся к задаче и не исправлялись.

## Доказательства
- `git diff --stat`: 11 изменённых файлов, +62 / -26 строк.
- Build output: `492 page(s) built`, `sitemap-index.xml` created.
- Check output: `Result (58 files): 0 errors, 0 warnings, 1 hint`.
- Пример city JSON-LD из сборки:
  `{"@type":"CollectionPage","name":"Врачи в Белград, Сербия","url":"https://rudoctors.github.io/cities/belgrade/","about":{"@type":"City","name":"Белград","containedInPlace":{"@type":"Country","name":"Сербия"}}}`

## Следующие шаги
- При необходимости добавить отдельные city intros для `Pančevo` в `src/data/city-intros.json` без выдуманных фактов.
- Проверить локализованные city labels на всех страницах новой сборки.
- Не менять канонические slug/legacy links; сохранять `city` в данных английским ключом.
- При будущих правках использовать `cityLabel()` для любого UI-вывода города.
