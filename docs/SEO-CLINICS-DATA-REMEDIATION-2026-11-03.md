# SEO / Clinics Data Remediation — 2026-11-03

**Worktree:** `D:\Projects\rudoctors\worktrees\clinics-data-remediation`  
**Ветка:** `agent/clinics-data-remediation-2026-11-03`  
**Дата выполнения:** 2026-11-04  
**Область:** только канонический реестр клиник, provenance, миграция `workplaces`, read-only аудит. Без публикации карт/UI, без выдуманных координат и клиник, без дублей страниц.

---

## 1. Проверено

- `README.md`, `STATE.md`, `TODO.md`, `docs/` (`SOURCES.md`, `DECISIONS.md`, `AUDIT.md`, `PLAN.md`), `git status`, `git log`.
- Текущая модель данных: клиника хранится только свободным текстом в `Doctor.workplaces[]` (`src/lib/types.ts`); отдельного реестра клиник не было.
- `scripts/seed.mjs` берёт `clinic_name`/`address` из источников, но не создаёт канонический реестр.
- `scripts/fetch-raw.mjs` умеет скачивать `rusdoctors.net/api/clinics`, однако raw-файл не коммитится и в реестр не превращается.
- Фактическое состояние данных: **433 JSON врача** (428 публичных, 5 скрытых), **344 workplace-записи**, **162 с адресом**, **30 с `mapsUrl`**, **166 различных строк клиник** (без нормализации).
- Публичных страниц клиник и карт в проекте нет; координаты (`lat`/`lng`) в данных врачей отсутствуют.

## 2. Подтверждено

- Проблема не в отсутствии «красивых карт», а в отсутствии канонической идентичности клиники, provenance и проверяемых адресов/координат.
- Прямое слияние строк клиник опасно: встречаются варианты одного бренда (`MediGroup` / `Клиника MediGroup`, `CITILAB` / `Поликлиника CITILAB`), разные филиалы и разные города.
- Адреса в существующих карточках неоднородны (латиница/кириллица, с городом и без, только район) и **не являются проверенными**.
- `mapsUrl` — внешние ссылки, а не координаты; их недостаточно для machine-checkable map gate.
- Массовая правка 428 карточек врачей не нужна и рискованна: миграция возможна обратносовместимо через необязательный `clinicId`.

## 3. Дефекты

1. Нет канонического реестра клиник: одна клиника может быть записана десятками строк, без стабильного ID.
2. Нет машиночитаемой связи «врач → клиника»: `workplaces[].clinic` — только текст.
3. Нет различия проверенных и непроверенных адресов/координат, нет provenance.
4. Нет publication gates: любой адрес/карта могли бы попасть в UI без проверки.
5. 182 из 344 workplace-записей не имеют адреса; 30 имеют только внешний `mapsUrl`.
6. Проверенных адресов — **0**, проверенных координат — **0**.
7. 151 группа клиник из текущих карточек не входит в стартовый реестр; 3 группы — кандидаты на ручную канонизацию, автоматически не сливались.
8. В стартовом реестре 0 координат: координаты не выдумывались и не переносились из внешних ссылок.

## 4. Исправления

### 4.1. Реестр клиник

Добавлен `src/data/clinics/registry.json`:

- `schemaVersion: 1`, `updatedAt: 2026-11-04`;
- **24 клиники**, **62 location**, **40 адресов**;
- все адреса — `verification: "unverified"`;
- все координаты — `value: null`, `verification: "unverified"`;
- у каждого location есть provenance на исходные JSON врачей (`doctor-workplace`);
- `aliases` намеренно пусты: варианты не объединялись автоматически;
- ни одной выдуманной клиники, координаты и «официальные» адреса не добавлялись.

### 4.2. Типы и миграция

В `src/lib/types.ts` добавлены:

- `Workplace.clinicId?: string` — обратносовместимая ссылка на реестр;
- `VerificationStatus`, `ClinicProvenance`, `ClinicAddress`, `ClinicCoordinates`, `ClinicLocation`, `Clinic`, `ClinicRegistry`.

`clinicId` проставлен только там, где название и город точно совпали с реестром (5 карточек):

- `aleksandar-crnobaric.json` → `medigroup-belgrade`;
- `predrag-skovric.json` → `medigroup-kalenic-belgrade`;
- `borisova-mariya-evgenevna.json` → `citilab-belgrade`;
- `daria-golubets.json` → `smile-on-belgrade`;
- `bakay-vladislav-andreevich.json` → `palkin-dental-center-belgrade`.

Остальные карточки не изменялись. Старый формат `workplaces[]` продолжает работать без `clinicId`.

### 4.3. Read-only аудит

Добавлен `scripts/clinics-audit.mjs` и команда `npm run audit:clinics`.

Проверяет:

- схему реестра, уникальность `clinic.id`, `location.id`, пары `name + city`;
- допустимые значения verification/provenance, ISO-даты, диапазоны координат;
- запрет непустых **непроверенных** координат;
- обязательные `verifiedAt`, `verifiedBy` и authoritative provenance для статуса `verified`;
- ссылки `workspace.clinicId` на существующую клинику, совпадение города и названия;
- непокрытые строки клиник и кандидатов на дубли — **только отчёт, без слияния**;
- publication gates.

Флаги: `--json`, `--verbose`. Инструмент ничего не пишет.

### 4.4. Publication gates (machine-checkable)

- **Address gate:** непустой адрес + `verification: "verified"` + `verifiedAt` + `verifiedBy` + provenance вида `clinic-website` или `official-registry` с `ref`/`url`.
- **Coordinate gate:** непустые `lat`/`lng` + `verification: "verified"` + `verifiedAt` + `verifiedBy` + authoritative provenance. Непроверенные координаты должны быть `null`.
- **Clinic page eligible:** пройден address gate хотя бы для одного location.
- **Map eligible:** пройдены address gate и coordinate gate для одного location.
- **Doctor link gate:** `clinicId` существует, город совпадает, название совпадает с canonical/alias.
- **Duplicate gate:** совпадения только репортятся; автоматическая конкатенация запрещена.

## 5. Файлы

- `src/data/clinics/registry.json` — стартовый реестр (новый).
- `src/lib/types.ts` — типы реестра и `Workplace.clinicId`.
- `scripts/clinics-audit.mjs` — read-only аудит/валидация (новый).
- `package.json` — `audit:clinics`.
- `README.md` — строка команды.
- `src/data/doctors/aleksandar-crnobaric.json` — `clinicId`.
- `src/data/doctors/predrag-skovric.json` — `clinicId`.
- `src/data/doctors/borisova-mariya-evgenevna.json` — `clinicId`.
- `src/data/doctors/daria-golubets.json` — `clinicId`.
- `src/data/doctors/bakay-vladislav-andreevich.json` — `clinicId`.
- `docs/SEO-CLINICS-DATA-REMEDIATION-2026-11-03.md` — отчёт.

## 6. Тесты

| Команда | Результат |
|---|---|
| `npm run audit:clinics` | OK, exit 0 |
| `npm run check` | 0 errors, 0 warnings, 1 pre-existing hint (`document.execCommand` в `add-doctor.astro`) |
| `npm run build` | 492 страницы, сборка успешна |
| Негативный тест аудита | временно добавленные непроверенные координаты → `FAIL`, exit 1; файл восстановлен |

Фактический вывод аудита:

```text
registry: 24 clinics, 62 locations, 40 addresses, 0 coordinates
verification: addresses 0/40 verified, coordinates 0/0 verified
publication gates: clinic pages 0/24 eligible, maps 0/24 eligible
doctor workplaces: 344 total, 5 linked via clinicId, 162 exact-link candidates (not written), 14 unnamed, 151 unregistered groups
duplicate name candidate groups (not merged): 3
```

## 7. Блокеры

- **0 проверенных адресов и 0 проверенных координат** — публиковать клиники/карты нельзя.
- Нет официальных источников для координат; существующие 30 `mapsUrl` не являются координатами.
- 151 группа клиник вне реестра требует ручного разбора; 3 группы вариантов (`MediGroup`, `CITILAB` и их «Клиника/Поликлиника») требуют ручного решения, а не автослияния.
- Филиалы внутри одного бренда (например, несколько адресов MediGroup в Белграде) нельзя считать одной точкой: в реестре они уже разведены по location.
- Публичный UI карт/клиник в этой задаче не создавался и не должен включаться до прохождения gates.

## 8. Доказательства

- Реестр: `src/data/clinics/registry.json` — 24 клиники, 62 location, 40 адресов, 0 координат.
- Provenance адресов: записи `kind: "doctor-workplace"` со ссылками на `src/data/doctors/*.json` и `retrievedAt: "2026-11-04"`.
- Связь врачей: 5 `clinicId`, проверенных аудитом; 162 точных кандидата не записаны автоматически.
- Негативный тест: `clinics[0].locations[0].coordinates` с непустыми `lat/lng` и `verification: "unverified"` → ошибка `unverified coordinates must be null (no invented map points)`, exit 1.
- `npm run check` и `npm run build` прошли; данные врачей не переписаны массово.

## 9. Следующие шаги

1. Проверить топ-клиники по официальным сайтам/реестрам, заполнить `verifiedAt`, `verifiedBy` и authoritative provenance.
2. Вручную разрешить 3 группы вариантов названий; при подтверждении использовать `aliases` или отдельные филиалы, без автослияния.
3. Постепенно проставлять `clinicId` для 162 точных кандидатов — отдельными проверяемыми PR, без массового скрипта.
4. Добавить проверенные координаты только после официального источника; до этого `coordinates.value` остаётся `null`.
5. После появления хотя бы одного полностью проверенного location включить read-only страницу клиники/карту строго по gates.
6. Добавить `npm run audit:clinics` в CI как отдельный шаг перед build.
