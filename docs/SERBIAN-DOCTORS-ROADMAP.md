# ТЗ и роадмап: Раздел сербских врачей (RuDoctors)

> **Статус:** 🟢 Завершено и внедрено (1 185 сербских врачей, 412 лицензий LKS, 1 527 суммарно в каталоге)  
> **Инициатива:** TSK-RD-14 / TASK-DOC-003  
> **Дата утверждения:** 21 ноября 2026 г.  
> **Ответственный компонент:** `site/scripts/*`, `src/data/*`, `src/pages/*`, `src/components/*`

---

## 1. Контекст и бизнес-цель

Портал **RuDoctors** (`rudoctors.com`) исторически формировался как каталог русскоязычных медицинских специалистов в Сербии. Однако в реальной практике экспаты сталкиваются с необходимостью обращения к профильным национальным сербским специалистам:
- Узкие и высокотехнологичные направления (кардиохирургия, онкохирургия, нейрохирургия, челюстно-лицевая хирургия, репродуктология);
- Ведущие государственные и ведомственные клинические центры Сербии: **ВМА (VMA)**, **УКЦС (UKCS)**, **Институт матери и ребёнка**, **GAK Narodni Front**;
- Авторитетные профессора и руководители частных ординаций в Белграде, Нови-Саде, Нише и Крагуеваце.

Главный барьер для пациентов-экспатов — языковой: сербские порталы ведутся исключительно на сербском языке, терминология и названия медицинских манипуляций сложны для восприятия, а отзывы содержат локальный сленг и специфику.

**Цель проекта:** Создать на RuDoctors полноценный структурированный раздел сербских врачей с:
1. Оригинальными именами на латинице (без искажения документов и лицензий);
2. Поисковой транслитерацией на русский язык (чтобы врача можно было найти как «Ćirović», так и «Чирович»);
3. Профессиональным переводом медицинских специальностей по единому рубрикатору;
4. Переводом отзывов пациентов на русский язык с обязательным сохранением сербского первоисточника (`textOriginal` + `langSource: "sr"`);
5. Визуальным бейджем `🇷🇸 Сербский врач` на карточках и в профиле;
6. Фильтрацией по происхождению в общем каталоге и выделенной SEO-страницей `/doctors/serbian/`.

---

## 2. Архитектура баз-доноров

| Донор | URL | Назначение | Доступность и объём |
|---|---|---|---|
| **Stetoskop.info** | `https://stetoskop.info/` | **Главный донор профилей врачей и клиник**.<br/>Извлекаются: ФИО, фото, специальность, опыт, биография, клиники (`hospitalAffiliation`), телефон. | `sitemap-lekari.xml` (5,042 профилей врачей), открытая микроразметка `Schema.org/Physician`. |
| **Hipokratija.rs** | `https://hipokratija.rs/` | **Главный донор реальных отзывов и детальных оценок**.<br/>Извлекаются: отзывы по врачам и клиникам, оценки по 4 критериям (качество, ожидание, чистота, цены). | `sitemap/ustanove-sitemap.xml` (5,569 учреждений), `sitemap/doktori-sitemap.xml`. |
| **OceniLekara.com** | `https://ocenilekara.com/` | **Оценки врачей и госучреждений**.<br/>Извлекаются: народные отзывы и оценки врачей (особенно государственных больниц VMA, KCS). | `sitemap-lekari.xml` (14,567 карточек врачей). |
| **NadjiDoktora.rs** | `https://www.nadjidoktora.rs/` | **Поиск врачей, стоматологов и отзывы**.<br/>Каталог врачей по специальностям и городам, отзывы и рекомендации пациентов. | Донор частной практики и стоматологии. |
| **Ordinacije.rs** | `https://ordinacije.rs/` | **Каталог ординаций и клиник Сербии**.<br/>База частных ординаций, поликлиник, диагностических центров и лабораторий. | Адреса, контакты, специализации и спектр медицинских услуг. |
| **BiramDoktora.rs** | `https://biramdoktora.rs/` | **Каталог врачей с привязкой к страховым компаниям**.<br/>Профили врачей с фильтрацией по ДМС (Generali, Uniqa, Wiener, Dunav), клиникам и услугам. | Структурированные профили, контакты и страховые компании. |
| **011info.com / Doktor.rs / Navidiku.rs** | `https://011info.com/` | **Исторические каталоги и справочники медицинских учреждений**.<br/>Старейшие базы ординаций и врачей Белграда и Сербии. | Контакты, архивные отзывы и адреса. |

---

## 3. Модель данных (`site/src/lib/types.ts`)

В интерфейс `Doctor` добавляются поля:
```typescript
export type DoctorOrigin = "ru" | "rs" | "intl";

export interface Doctor {
  slug: string;
  name: string;             // Оригинальное имя (латиница): "Dragan Ćirović"
  nameRu?: string;           // Транслитерация для поиска: "Драган Чирович"
  nameEn?: string;           // Международное написание
  origin?: DoctorOrigin;     // "rs" для сербских врачей, "ru" для русскоязычных
  specializations: string[]; // Стандартизированные ключи из specialties.json
  specializationText?: string;
  photo?: string;
  experienceYears?: number;
  city: string;              // "Belgrade", "Novi Sad", "Niš", "Kragujevac"
  district?: string;
  languages: string[];       // ["sr", "en", "ru"]
  formats: Array<"offline" | "online">;
  bio?: string;
  education: EducationItem[];
  workplaces: Workplace[];
  contacts: { ... };
  reviews: Review[];
  license?: LicenseInfo;
  verificationStatus?: "self" | "clinic" | "public-source" | "verified";
  hidden: boolean;
  featured: boolean;
  sources: string[];
  updatedAt: string;
}
```

Модель отзыва `Review`:
```typescript
export interface Review {
  id: string;
  author: string;
  date: string;
  rating?: number;          // 1..5 или 0
  text: string;             // Перевод на русский язык
  textOriginal?: string;    // Исходный текст отзыва на сербском
  lang?: string;            // "ru"
  langSource?: string;      // "sr"
  source?: string;          // URL или домен источника ("stetoskop.info", "hipokratija.rs")
  criteria?: {
    effectiveness?: number;
    communication?: number;
    wait?: number;
    price?: number;
    overall?: number;
  };
}
```

---

## 4. Пайплайн обработки данных

```
[Stetoskop / Hipokratija / OceniLekara]
                 │
                 ▼
       site/scripts/scrape-*.mjs
                 │
                 ▼ (сырые JSON)
    site/scripts/dedup-serbian-doctors.mjs
  (сопоставление имён, клиник, транслитерация)
                 │
                 ▼
  site/scripts/translate-serbian-content.mjs
  (маппинг специальностей + перевод отзывов)
                 │
                 ▼
       src/data/doctors/*.json
```

### Правила сопоставления специальностей (Сербский → RuDoctors)
- `Hirurgija` / `Hirurg` → `surgeon` («Хирург»)
- `Kardiologija` / `Kardiolog` → `cardiologist` («Кардиолог»)
- `Ginekologija i akušerstvo` → `gynecologist` («Гинеколог»)
- `Pedijatrija` / `Pedijatar` → `pediatrician` («Педиатр»)
- `Stomatologija` / `Stomatolog` → `dentist` («Стоматолог»)
- `Dermatovenerologija` → `dermatologist` («Дерматолог»)
- `Oftalmologija` → `ophthalmologist` («Офтальмолог»)
- `Otorinolaringologija` / `ORL` → `otorhinolaryngologist` («ЛОР»)
- `Neurologija` → `neurologist` («Невролог»)
- `Ortopedija` / `Traumatologija` → `traumatologist_orthopedist` («Травматолог-ортопед»)
- `Urologija` → `urologist` («Уролог»)
- `Psihijatrija` → `psychiatrist` («Психиатр»)
- `Endokrinologija` → `endocrinologist` («Эндокринолог»)
- `Gastroenterologija` → `gastroenterologist` («Гастроэнтеролог»)
- `Opšta medicina` / `Lekar opšte prakse` → `gp` («Врач общей практики»)

---

## 5. UI и витрина

1. **Компонент карточки (`DoctorCard.astro`):**
   - Информационный бейдж:
     `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-600/10">🇷🇸 Сербский врач</span>`
   - Отображение языков приёма (SR, EN, RU).

2. **Фильтрация в общем каталоге (`/doctors/`):**
   - Селектор: «Все специалисты», «🇷🇸 Сербские врачи», «Русскоязычные врачи».
   - URL-параметр: `?origin=rs` или `?origin=ru`.
   - Полнотекстовый поиск по обоим языкам: поиск по слову «хирург» или «hirurg», «чирович» или «cirovic».

3. **Выделенная SEO посадочная страница (`/doctors/serbian/`):**
   - Заголовок H1: *«Сербские врачи: каталог, отзывы на русском и рейтинг специалистов»*.
   - SEO метатеги Title/Description с геопривязкой (Белград, Нови-Сад, Ниш).
   - Хлебные крошки: *Главная → Врачи → Сербские врачи*.
   - Прямой доступ к ведущим национальным специалистам.

4. **Детальная страница врача (`/doctors/[slug]/`):**
   - Бейдж `🇷🇸 Сербский врач` в шапке профиля;
   - Спойлер `<details><summary>Оригинал (SR)</summary>...</details>` для отзывов, переведённых с сербского.

---

## 6. Регламент актуализации данных
- Ежемесячный запуск скриптов обновления отзывов (`scrape-hipokratija.mjs`, `scrape-stetoskop.mjs`);
- Автоматическая валидация целостности схемы данных (`npm run check` и проверка `loadDoctors()`);
- Предотвращение дубликатов через `dedup-serbian-doctors.mjs`.
