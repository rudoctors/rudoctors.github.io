# Ремедиация review-flow — отчёт

**Ветка:** `agent/review-flow-remediation-2026-11-03` · **Worktree:** `D:\Projects\rudoctors\worktrees\review-flow-remediation`
**Дата отчёта:** 2026-11-03 (выполнение — 04.11.2026) · **База:** `ae1b7dd` (feat(crm): review CRM через Deno relay / GAS / Telegram)

---

## 1. Проверено (checked)

- `README.md`, `STATE.md`, `TODO.md`, `docs/` (PLAN, AUDIT, DECISIONS, OPS, TELEGRAM-BOT), `git status/log` — стартовый контекст; работа только в назначенном worktree/ветке.
- Модель intake отзывов end-to-end: браузерная форма `src/pages/leave-review.astro` → Deno relay `deno/doctor-relay.ts` (`POST /api/review`) → GAS CRM `deno/gas_review_script.js` (Google Sheet) → кнопки `rev_ok/rev_no` → `publishReview()` → JSON врача → сборка.
- Расчёт рейтинга: `src/lib/rating.ts` (`reviewScore`, `computeRating`), валидатор `src/lib/doctors.ts` (rating 0–5, fail-fast), отображения `src/components/Stars.astro`, `src/components/DoctorCard.astro`, `src/pages/doctors/[slug].astro` (JSON-LD `Physician`/`AggregateRating`, блок disclosure, список отзывов).
- Сканированием подтверждено: в репо 433 JSON-карточки, числовые оценки в отзывах отсутствуют (0-rated только), `aggregateRating` не публикуется ни на одной из 433 собранных страниц врачей.

## 2. Подтверждённые дефекты (confirmed)

| # | Дефект | Где |
|---|--------|-----|
| D1 | **Scoreless-отзыв превращался в 5**: `rating = Math.min(5, Math.max(1, Number(data.rating) \|\| 5))` — без оценки/битое значение → принудительная «5» при intake и при апруве (`Number(r.rating) \|\| 5`) | `deno/doctor-relay.ts` (2 места intake + `handleReviewCallback`) |
| D2 | **Два POST `/api/review`** в одном handler'е `Deno.serve` (первый — с порогом текста 20 и fire-and-forget GAS-записью + хрупким JSON в HTML-комментарии, второй — порог 10 и `await` GAS): у копий расходились правила валидации; фактически работал только первый | `deno/doctor-relay.ts:646` и `:723` |
| D3 | **Порог текста не согласован**: браузер 30 (`minlength="30"` + JS-проверка), relay-копия 1 — 20, relay-копия 2 и GAS — 10. Клиент, который пробьет HTML minlength, отправлял бы короткий текст | три файла |
| D4 | **count/average не согласованы**: `computeRating` возвращал `count = scored.length` в смешанной ветке, но `count = all.length` при scoreless-only; с рейтингами `AggregateRating.reviewCount` мог показывать число ВСЕХ отзывов (включая текстовые без оценки), в то время как `ratingValue` считался по другому множеству | `src/lib/rating.ts`, `[slug].astro` |
| D5 | **Оценка обязательна в UI** против требования «числовая оценка опциональна»: `<select required>`, по умолчанию «5» (`fd.get("rating") \|\| "5"`), отправлялся всегда | `leave-review.astro` |
| D6 | **Публикация с выдуманной оценкой**: `publishReview()` писал `rating: 5` в JSON врача для scoreless-отзыва → контаминировал будущий AggregateRating | `publishReview()` |
| D7 | Мёртвый дублирующий CORS-OPTIONS-блок и мёртвые ветки кода (second handler unreachable) | `deno/doctor-relay.ts` |

## 3. Исправления (fixes)

1. **Общая валидация intake** — новый модуль `deno/review-intake.ts`:
   - `parseOptionalRating()`: только целые 1..5; всё прочее (`""`/`null`/`undefined`/0/6/4.5/`"abc"`) → `null` (scoreless). Никаких значений по умолчанию.
   - `normalizeReview()`: единые обязательные поля (`doctor_slug`, `author`, text ≥ `REVIEW_TEXT_MIN`=30) и ошибки.
2. **Единственный канонический `POST /api/review`** (D2, D7): дубликат удалён; оставлен один handler с `await`-GAS-записью, GAS-generated ID, Telegram-карточкой с кнопками; дублирующий OPTIONS-блок удалён (общий верхний остался); `const CORS_ORIGIN` вынесен.
3. **publishReview не пишет rating для scoreless** (D1, D6): `...(rev.rating !== null ? { rating: rev.rating } : {})`; Telegram-сообщения апрува/отклонения показывают «без оценки».
4. **GAS-скрипт** (`deno/gas_review_script.js`): `TEXT_MIN = 30`; rating только целое 1..5, иначе пустая ячейка G; карточка в Telegram: `— (без оценки)`; заполнение ячейки «Оценка» пустое вместо принудительной 5.
5. **Браузерная форма** (`src/pages/leave-review.astro`): ставка «Оценка (необязательно)» с опцией «Без оценки» (required снят); в JSON поле `rating` отправляется только при валидном выборе 1..5; порог 30 без изменений.
6. **Согласованность count/average** (D4) — `computeRating` теперь всегда: `count` = все релевантные отзывы (совпадает с заголовком «Отзывы (N)» и списком), новый `ratedCount` = количество валидных оценок 1..5, вошедших в `average`; в `[slug].astro` и `DoctorCard.astro`:
   - гейт JSON-LD `rating.ratedCount > 0 && rating.average > 0` — **AggregateRating не публикуется без валидных числовых данных**;
   - `reviewCount: rating.ratedCount` — ровно то же множество оценок, что дало `ratingValue`;
   - `Stars` показывает «N оценок» рядом со звёздами (`ratedCount`), а когда оценок нет — бейдж «N отзывов» по текстовым (`textCount`) или «Пока нет отзывов».
7. Тип `RatingSummary` расширен (`ratedCount`); валидатор карточек `doctors.ts` без изменений (0–5 остаётся инвариантом данных).

## 4. Файлы (changed / added)

| Файл | Тип |
|------|-----|
| `deno/review-intake.ts` | **новый** — общий контракт intake (опциональная оценка, порог 30) |
| `deno/review-flow.test.ts` | **новый** — 16 исполнимых проверок (см. §5) |
| `deno/doctor-relay.ts` | правка — один POST /api/review, опциональный рейтинг, публикация без выдуманных 5 |
| `deno/gas_review_script.js` | правка — TEXT_MIN 30, оценка опциональна, без подмены на 5 |
| `src/pages/leave-review.astro` | правка — «Без оценки», отправка rating только при 1..5 |
| `src/lib/rating.ts` | правка — согласование count/ratedCount/average |
| `src/lib/types.ts` | правка — `RatingSummary.ratedCount` |
| `src/pages/doctors/[slug].astro` | правка — гейт и reviewCount по ratedCount; Stars с textCount |
| `src/components/Stars.astro` | правка — «N оценок» рядом со звёздами; бейдж текстовых отзывов |
| `src/components/DoctorCard.astro` | правка — те же согласованные пропсы Stars |
| `package.json` | правка — скрипты `check:relay`, `check:review` |

## 5. Исполнимые проверки (execution evidence)

Новая команда: **`npm run check:review`** → `deno test --allow-read --no-config --sloppy-imports deno/review-flow.test.ts`.
Все кейсы воспроизводимы, 16 passed / 0 failed:

- scoreless: intake без rating / null / "" → `rating: null`, никогда не 5 (3 теста);
- явные 1..5 сохраняются как есть; 0/6/-1/4.5/"abc"/"0"/"6" → null (2 теста);
- текст < 30 → отклонена с ошибкой; порог `REVIEW_TEXT_MIN` == 30 (2 теста);
- равенство порогов браузер = relay = GAS = 30 (греп-контракт: `minlength="30"`, `text.length < 30`, `TEXT_MIN = 30`, импорт общей валидации) (2 теста);
- ровно один `POST /api/review` (`req.method === "POST" && url.pathname === "/api/review"` встречается 1 раз); отсутствует `|| 5` в коде relay и GAS (комментарии вырезаются перед проверкой) (3 теста);
- `publishReview` пишет rating только при валидном значении; JSON-LD-гейт `ratedCount>0 && average>0`, `reviewCount: rating.ratedCount` (2 теста);
- `computeRating`: scoreless-only → average 0 + ratedCount 0 (AggregateRating не публикуется); смешанный набор → count=все, ratedCount=оценки в average, average ∈ 1..5; 0 вне average; 6 — clamp-защита 1..5 (3 теста);
- **скан 433 JSON-карточек**: каждая сохранённая оценка — отсутствует/0 или целое 1..5; `ratedCount == число валидных оценок`; `count == длина списка отзывов`; без оценок average == 0; ожидается 0 врачей с оценками (validated);

Запуски:
- `deno test ...` → **ok | 16 passed | 0 failed**;
- `npm run check` (`astro check`) → **0 errors / 0 warnings / 1 hint** (pre-existing, как в STATE.md);
- `deno check deno/doctor-relay.ts` (+ `deno/review-intake.ts`, `--no-config --sloppy-imports`) → **OK**;
- `npm run build` → **492 page(s) built**, Complete;
- контроль сборки: 0 страниц из 433 содержат `aggregateRating` (нет числовых данных — публикация корректно заблокирована); `/leave-review/` содержит «Оценка (необязательно)» и «Без оценки».

## 6. Блокеры (blockers)

- Нет блокирующих. Не выполнимо агентом по определению (вне scope): репликация правок в развёрнутые внешние системы — **Deno Deploy relay** и **Google Apps Script Web App** обновляются их владельцем вручную (`deno deploy` / redeploy GAS). Локальные источники в репо — источник истины.
- Внимание: существующие в Google Sheet scoreless-записи, созданные до ремедиации с оценкой «5» по старой логике, остаются со значением 5 — их нужно пересмотреть вручную в таблице (их presence в JSON сайта невозможен: publishReview после ремедиации rating не пишет).

## 7. Доказательства (evidence)

- Диффы: `git diff` по перечню §4; `git status` — только относящиеся к задаче файлы (9 изменённых, 2 новых), unrelated данные не тронуты.
- Test source: `deno/review-flow.test.ts` (исполним и читается как спецификация контракта); общий модуль `deno/review-intake.ts`.
- Сборка/линт выводы см. §5; канал `api/review`: первая копия удалена из `Deno.serve`, второй (канонический) блок оставлен с пометкой «Единственный канонический вход отзывов».

## 8. Следующие шаги (next steps)

1. Владелец: redeploy relay (`deno deploy`/Deploy GitHub) и GAS Web App, чтобы новый контракт жил в прод-системах.
2. Ревизия исторических CRM-строк со scoreless-записями, у которых старая логика проставила 5, — скорректировать в таблице и повторить апрув (позиция уже безопасна: publish рейтинг отбросит).
3. При появлении первых валидных оценок: прогнать `npm run check:review` (скан автоматически проверит согласованность новых данных), затем `check`/`build` — AggregateRating информацию о provenance-примечании можно будет выпустить одновременно с первой оценкой.
4. Опционально: после redeploy можно покрыть E2E-тестом полный цикл «intake → GAS → апрув», включая сверку ID, который возвращает GAS, когда он недоступен (fallback `reviewId()` уже реализован).

---

*Отчёт составлен агентом review-flow-remediation; изменения не коммичены и не деплоены (per instructions).*