# Telegram-модерация заявок «Добавить врача»

Обновлено: 2026-09-24

## Статус: НАСТРОЕНО И ПРОВЕРЕНО E2E (24.09.2026)

- Бот: **@rudoctors_moderation_bot** (создан через @BotFather от Telegram-аккаунта
  `new` = balkandunav, реестр `D:\PAIOS\config\telegram-accounts.json`).
- Конфиг: `site/.env` заполнен (TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID=8953219173,
  GITHUB_TOKEN — активный токен gh CLI TheWayofDHD). `.env` не коммитится.
- E2E 24.09.2026: issue #1 «✅ Опубликовать» → JSON закоммичен ботом, схема прошла
  валидацию сборки (190 pages), CI success; тестовая карточка удалена (`70dda92`).
  Issue #2 «❌ Отклонить» → issue закрыт с комментарием.
- Запуск: `npm run tg:bot` (бот работает, пока запущен процесс).

## Как это работает

```text
Форма /add-doctor/
  → посетитель подтверждает отправку на GitHub
  → GitHub Issue (label doctor-request) в rudoctors/rudoctors.github.io
  → бот (npm run tg:bot) присылает заявку в личный чат владельца
      [✅ Опубликовать]  [❌ Отклонить]
  → «✅» → бот коммитит src/data/doctors/<slug>.json и закрывает issue
  → GitHub CI пересобирает сайт (~2–3 мин) → врач появляется в каталоге
  → «❌» → issue закрывается с комментарием «отклонено»
```

GitHub Issue остаётся очередью и публичным следом заявки (это отражено в
консент-тексте формы и политике конфиденциальности). Telegram — только
интерфейс модерации. Схему карточки бот собирает ту же, что и `/admin/`
(см. `src/lib/types.ts` и `validateDoctor` в `src/lib/doctors.ts`).

Дополнительно бот:

- свободный текст специальности маппит на ключ из `src/data/specialties.json`
  (точное/частичное совпадение, иначе — транслит в новый ключ);
- раскладывает «Контакт» по полям: `@handle`/t.me → `contacts.telegram`,
  email → `contacts.email`, телефон → `contacts.phone`, нераспознанное → в bio;
- помечает отправленные заявки меткой `tg-sent`, чтобы не слать повторно;
- команды от чужих chat_id игнорирует.

## Настройка (один раз)

1. **Создать бота:** в Telegram у @BotFather → `/newbot` → получить токен
   вида `123456:AA…`.
2. **Узнать свой chat_id:** написать созданному боту `/start` при запущенном
   `npm run tg:bot` — он ответит и подскажет `chat_id`. (Либо временно
   запустить `npm run tg:bot` без настройки — в логе будет подсказка.)
3. **GitHub PAT:** создать fine-grained PAT (Settings → Developer settings →
   Fine-grained tokens) только на репозиторий `rudoctors/rudoctors.github.io`
   с правами **Contents: Read and write** и **Issues: Read and write**.
4. **Заполнить `site/.env`** по образцу `site/.env.example`:

   ```env
   TELEGRAM_BOT_TOKEN=123456:AA…
   TELEGRAM_ADMIN_CHAT_ID=123456789
   GITHUB_TOKEN=github_pat_…
   GITHUB_REPO=rudoctors/rudoctors.github.io
   ```

5. **Проверить и запустить:**

   ```powershell
   npm run tg:bot -- --check     # конфиг валиден?
   npm run tg:bot                # long polling (окно/терминал держать открытым)
   ```

`.env` в `.gitignore` — не коммитить и не переносить в память/PAIOS.

## Ограничения

- Бот работает, пока запущен скрипт. Кнопки, нажатые при выключенном боте,
  Telegram хранит ~24 часа и отдаст при следующем запуске; новые заявки
  уйдут в чат только после запуска. Если нужен always-on — скрипт можно
  поднять на любом бесплатном хосте без изменений кода.
- При «✅» бот коммитит прямо в `main` (как и `/admin/`) — публикация
  необратима на уровне бота; откат — через `/admin/` (hidden) или git.
- Повторный нажатый «✅» на обработанной заявке безопасен: бот ответит
  «уже обработана».
