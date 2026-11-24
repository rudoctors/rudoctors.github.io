# Задачи роста и оптимизации (AI Growth Director)

> **Сайт**: Doctors (RuDoctors) (https://rudoctors.com)
> **Дата синхронизации**: 2026-11-21T20:18:20.887Z
> **Статус валидации**: Проверено Gatekeeper-агентом на соответствие коду и паспорту проекта.

---

## Одобренные приоритетные задачи к внедрению

### [HIGH] TASK-DOC-001: Внедрение плавающего быстрого CTA записи к врачу на мобильных устройствах
- **Ответственный агент**: CRO-агент
- **Целевой URL / Страница**: `https://rudoctors.com/doctors`
- **Файл в репозитории**: `src/pages/doctors/index.astro`
- **ICE Score**: **576** (Impact: 8, Confidence: 9, Ease: 8)
- **Проблема**: Мобильные пользователи скроллят каталог врачей, но кнопка записи находится внизу карточки, что создает трение при просмотре
- **Что внедрить**: Добавить липкий нижний бар (sticky CTA) с быстрой кнопкой 'Записаться к врачу' и связью в Telegram / форму
- **Ожидаемый бизнес-эффект**: **Рост конверсии из визита в заявку на запись с 1.33% до 1.85% (+39%)**
- **Метрика проверки**: `Событие GA4: click_doctor_booking_mobile в течение 14 дней`
- **Заключение Gatekeeper**: _Компонент каталога доступен в `src/pages/doctors/index.astro`. Стили Tailwind совместимы, конфликтов роутинга нет._

**Шаг проверки после внесения правок**:
```bash
pnpm check
node scripts/validate-build.mjs
git diff --check
```

---

### [HIGH] TASK-DOC-002: Оптимизация сниппетов и Title для региональных посадочных страниц (Белград, Нови Сад)
- **Ответственный агент**: SEO-агент
- **Целевой URL / Страница**: `https://rudoctors.com/cities`
- **Файл в репозитории**: `src/pages/cities/[city].astro`
- **ICE Score**: **504** (Impact: 7, Confidence: 8, Ease: 9)
- **Проблема**: По запросам 'русскоязычный врач Белград' CTR сниппета в Google составляет 1.4%, сниппет не содержит УТП и числа врачей
- **Что внедрить**: Обновить Title шаблона: 'Русскоязычные врачи в Белграде — проверенные отзывы, контакты и запись | RuDoctors'
- **Ожидаемый бизнес-эффект**: **Рост органического CTR в Google с 1.4% до 2.8% на 25 основных запросах**
- **Метрика проверки**: `Search Console CTR в течение 21 дня после переиндексации`
- **Заключение Gatekeeper**: _Динамический роут `src/pages/cities/[city].astro` найден. Метатеги конфигурируются в BaseLayout props._

**Шаг проверки после внесения правок**:
```bash
pnpm check
node scripts/validate-build.mjs
git diff --check
```

---

### [DONE] TASK-DOC-003: Создание посадочных кластеров горячего спроса: Педиатр, Стоматолог, УЗИ/Анализы (Белград и Нови-Сад)
- **Статус**: 🟢 **Выполнено и внедрено** (21-23 ноября 2026 г.)
- **Целевой URL / Страница**: `https://rudoctors.com/cities/[city]/[specialty]`
- **Файл в репозитории**: `src/pages/cities/[city]/[specialty].astro`, `src/lib/clusters.ts`
- **Что внедрено**:
  - Создан динамический маршрутизатор `src/pages/cities/[city]/[specialty].astro`, генерирующий 147 страниц связок «город + специальность».
  - Разработан модуль `src/lib/clusters.ts` с углубленным контентом для 6 ключевых горячих кластеров:
    - Белград / Педиатр (`/cities/belgrade/pediatrician/` — 58 врачей, неотложка UDK Tiršova, Институт матери и ребенка, вызов на дом, цены в RSD/EUR, FAQ);
    - Белград / Стоматолог (`/cities/belgrade/dentist/` — 162 врача, дежурная стоматология Стоматологического факультета, 3D CBCT / Ortopan рентген-центры, прейскурант, FAQ);
    - Белград / УЗИ (`/cities/belgrade/ultrasound_diagnostics/` — 11 врачей, Euromedik, MediGroup, 24h анализы Aqualab Plus Slavija, цены);
    - Нови-Сад / Педиатр (`/cities/novi-sad/pediatrician/` — 12 врачей, Dečija bolnica Novi Sad, MediGroup / Consilium, цены, FAQ);
    - Нови-Сад / Стоматолог (`/cities/novi-sad/dentist/` — 24 врача, дежурная Klinika za stomatologiju Vojvodine, 3D Rendgen Centar NS, цены, FAQ);
    - Нови-Сад / УЗИ (`/cities/novi-sad/ultrasound_diagnostics/` — 6 врачей, Poliklinika Consilium, центральная Jugolab, цены, FAQ).
  - Микроразметка Schema.org: `MedicalWebPage`, `CollectionPage`, `FAQPage`, `BreadcrumbList`.
  - Двусторонняя SEO-перелинковка: блок «Популярное» на `/cities/[city]/` перенаправлен на кластеры; блок городов на `/specialties/[key]/` содержит кликабельные теги кластеров; добавлены редиректы транслитерированных алиасов (`uzi`, `stomatolog`, `pediatr`) в `astro.config.mjs`.
  - Общее число страниц сайта при сборке выросло с 1 620 до 1 767.

---

### [DONE] TASK-DOC-004: Масштабирование кластерной архитектуры на ВСЕ специальности и матрица внутренней перелинковки
- **Статус**: 🟢 **Выполнено и внедрено** (24 ноября 2026 г.)
- **Ответственный агент**: SEO & Architecture Director
- **Целевой URL / Страница**: `https://rudoctors.com/cities/[city]/[specialty]` и `https://rudoctors.com/`
- **Файлы в репозитории**: `src/lib/specialty-blueprints.ts`, `src/lib/clusters.ts`, `src/pages/cities/[city]/[specialty].astro`, `src/pages/index.astro`, `scripts/indexnow.mjs`, `astro.config.mjs`
- **Что внедрено**:
  1. Разработан модуль `src/lib/specialty-blueprints.ts`, масштабирующий E-E-A-T инфраструктуру, прейскуранты в RSD и EUR (2026) и дежурные клиники (KCS, KCV, Narodni Front, Tiršova, Banjica, Betanija, Palmaтичева и др.) на ВСЕ 45 специальностей каталога.
  2. Модуль `src/lib/clusters.ts` объединен со сборщиком: 100% кластеров (147 посадочных страниц) получили блоки дежурных стационаров, таблицы цен и микроразметку Schema.org `FAQPage` и `MedicalWebPage`.
  3. Внедрена двухколоночная SEO-матрица перелинковки на Главной странице (`src/pages/index.astro`) для Белграда (16 топ-направлений) и Нови-Сада (12 топ-направлений) со сквозной передачей PageRank.
  4. Добавлены транслит-алиасы в `astro.config.mjs` (`ginekolog`, `psihiatr`, `terapevt`, `kardiolog`, `dermatolog`, `nevrolog`, `hirurg`, `lor`).
  5. Скрипт `scripts/indexnow.mjs` модернизирован с поддержкой прямого шлюза **Яндекса (`https://yandex.com/indexnow`, HTTP 202 Accepted)** и Bing (`api.indexnow.org`, HTTP 200 OK), а также режима приоритетной отправки кластеров.
  6. Оптимизирован вес HTML-страниц каталога: пагинация по 24 карточки снизила размер DOM до < 100 Кб (вместо 170–250 Кб) в соответствии с правилом Core Web Vitals.
- **Ожидаемый бизнес-эффект**:
  - Вытеснение `rusdoctors.net` из органического топ-3 Яндекса по запросам связок «город + специальность»;
  - Рост видимости в Google AI Overviews и ускорение переиндексации до 2–4 часов через прямой IndexNow Yandex API.

**Шаг проверки после внесения правок**:
```bash
npm run check
npm run build
node scripts/validate-build.mjs
git diff --check
```

---

