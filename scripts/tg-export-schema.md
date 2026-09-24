# Схема извлечения врачей из Telegram-экспорта

Источник: сообщения чата «Медицина в Сербии» / @vrachivserbii.
Из каждого сообщения извлекаем **кандидатов-врачей**. Мусор (адреса аптек, вакансии, флуд, «ищу врача» без персоны) — пропускаем.

## Контекст

- Сайт: русскоязычный каталог врачей Сербии.
- Уже есть ~140 карточек — смотри `tg-export-existing-doctors.json` (поле `name`).
- Цель: **новые / неполные** персоны; отзывы без связи с врачом не нужны.

## Выход (JSON-массив)

```json
{
  "name": "Фамилия Имя [Отчество] | Order Last First",
  "nameEn": "только если явно в тексте латиницей",
  "role": "doctor | psychologist | nutritionist | other_specialist | clinic_staff",
  "specializationsText": "сырой текст спец. на RU как в посте",
  "specializations": ["therapist"],
  "city": "Belgrade",
  "district": null,
  "languages": ["ru"],
  "contacts": {
    "phone": "только публичный телефон врача/клиники приёма",
    "email": null,
    "telegram": "https://t.me/...",
    "website": "https://..."
  },
  "workplaces": [{ "clinic": "...", "address": "...", "city": "Belgrade" }],
  "bio": "кратко 1–3 факта из поста (опыт, документы) или null",
  "confidence": "high|medium|low",
  "kind": "visitka|recommendation|review_mention",
  "msgId": 123,
  "msgUrl": "https://t.me/vrachivserbii/123",
  "msgDate": "2024-01-01",
  "notes": "почему это врач / сомнения"
}
```

### Правила

1. **name** — обязательное, ≥2 токенов (кроме явных «доктор X»). Чинить порядок не нужно; оставляй как в тексте.
2. **specializations** — только ключи из `src/data/specialties.json` (RU-значения мапь на ключ). Неизвестное → `specializationText` + `["therapist"]` **только если** текст явно врач; иначе omit key и role=other_specialist, specializations=[].
3. Психологи/психотерапевты/нутрициологи — **включать** (role по смыслу), specializations: psychologist / psychotherapist / dietologist→нет ключа → therapist или specializationsText.
4. **Не выдумывать**: нет телефона/города — null/omit. Без фейковых рейтингов.
5. Одно сообщение → 0..N кандидатов (список врачей).
6. Если name ≈ существующему из existing (фамилия+имя) — всё равно вывести, поле `notes: "likely_exists"`.
7. Отзывы: только если явно назван врач/доктор по имени; kind=review_mention; contacts можно null.
8. Рекомендации: kind=recommendation.
9. Не копировать переписку/вопросы пациентов без именованного специалиста.
