# Заявки врачей: Google Apps Script

Файл [`deno/gas_doctor_request_script.js`](../deno/gas_doctor_request_script.js) —
исходник отдельного Apps Script-проекта для формы `/add-doctor/`. Он не содержит
секретов и не использует Deno.

## Однократная настройка

1. Откройте [script.google.com](https://script.google.com/home) и создайте
   **новый самостоятельный Apps Script-проект**. Не открывайте «Расширения →
   Apps Script» в таблице `CRM Отзывы — Rudoctors` и не заменяйте её скрипт:
   там работает независимый intake отзывов. В новый проект вставьте только
   содержимое `deno/gas_doctor_request_script.js`.
2. В Script Properties самостоятельного проекта задайте `GOOGLE_SHEET_ID`
   (ID таблицы `CRM Отзывы — Rudoctors` из её URL), `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_ADMIN_CHAT_ID`, `GITHUB_TOKEN` и
   `GITHUB_REPO=rudoctors/rudoctors.github.io`. Токен GitHub должен иметь
   только права **Issues: read/write** для этого репозитория.
3. Разверните как **Web app**: *Execute as: Me*, *Who has access: Anyone*.
   Скопируйте URL, оканчивающийся на `/exec`.
4. Задайте этот URL в GitHub Actions Variable
   `PUBLIC_DOCTOR_WEBHOOK_URL` и в соответствующем локальном `.env`, затем
   выполните Pages deploy.

Скрипт через `GOOGLE_SHEET_ID` открывает CRM-таблицу и создаёт в ней лист
`Заявки врачей`; он не зависит от привязанного к таблице скрипта отзывов.
После записи обращения он создаёт очередь модерации в GitHub Issue с меткой
`doctor-request` и присылает карточку в Telegram. Дальнейшее одобрение остаётся
у существующего moderation-бота: только после явной команды модератора врач
публикуется в каталоге.

## Проверка

Отправляйте только маркированную тестовую заявку без реальных персональных
данных. Подтвердите: HTTP-ответ с `ok: true`, новую строку в `Заявки врачей`,
GitHub Issue и Telegram-уведомление. После проверки закройте тестовый Issue.
