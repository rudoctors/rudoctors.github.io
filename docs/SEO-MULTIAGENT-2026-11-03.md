# RuDoctors — реестр SEO multi-agent запуска

Дата запуска: 2026-11-03 (Europe/Budapest). Базовый коммит: `ae1b7dd55238d7c7f55c5caa495980f8ddcc04e4` (`main`, чистый на момент подготовки).

## Статус запуска

OpenCode 1.18.32 установлен и Git worktree созданы. Первые шесть запусков на платно/credential-зависимых моделях завершились до обработки заданий; их ошибки сохранены отдельно. После запроса использовать бесплатные модели выполнен второй запуск: шесть независимых `opencode run --auto --format json` работают в фоне и подтвердили начало работы по живому PID и первым tool-вызовам в логах. Отчётов и изменений на момент фиксации ещё нет — это ожидаемо, интеграция сознательно не начата.

Логи и исходный launcher находятся вне Git: `D:\Projects\rudoctors\logs\seo-multiagent-2026-11-03\`. Актуальные PID, модели и каталоги: `free-model-attempt\launch-records.json`; stdout/stderr бесплатного запуска находятся в `free-model-attempt\`. Launcher: `launch-opencode-agents.ps1`; он содержит самостоятельные задания для повторного запуска.

| Агент | Направление и ожидаемый отчёт | Ветка / worktree | Модель и PID | Статус и подтверждение | Логи | Критерии приёмки |
| --- | --- | --- | --- | --- | --- | --- |
| 1 technical-seo | ТехSEO, индексация, GSC verification/TLS; `docs/SEO-TECHNICAL-AUDIT-2026-11-03.md` | `agent/technical-seo-2026-11-03` / `D:\Projects\rudoctors\worktrees\technical-seo` | `opencode/beam-free`, PID 41208, `ses_e5d6857d0ffebVhlGWUAWae61H` | Запущен, PID жив; начаты чтение проекта и проверка | `free-model-attempt\technical-seo.*.log` | Таблица URL/доказательство/серьёзность/исправление; только подтверждённые исправления; релевантные тесты; GSC/Neo — только при уже доступной авторизации. |
| 2 search-console | GSC, Яндекс, Windsor.ai, Bing/IndexNow, измерения и передача прав GSC; `docs/SEO-SEARCH-CONSOLE-REPORT.md` | `agent/search-console-2026-11-03` / `D:\Projects\rudoctors\worktrees\search-console` | `opencode/big-pickle`, PID 17216 (перезапуск после корректировки) | Запущен: прежний PID 33452 остановлен без незакоммиченных изменений; новый агент получил задачу для трёх URL-prefix properties | `free-model-attempt\search-console-ownership.*.log`, `search-console-ownership-launch.json` | Подтверждённые 28/90-дневные метрики либо явное N/A; причины исключения; источники; без обхода авторизации. Для `rudoctors`, `wellnessnd`, `nd-science`: сначала подтверждённый owner `ivan.dolgov.hd@gmail.com`, затем удаление `thewayofdhd@gmail.com` и повторная проверка доступа. |
| 3 regional-seo | Региональные посадочные и schema; `docs/SEO-REGIONAL-2026-11-03.md` | `agent/regional-seo-2026-11-03` / `D:\Projects\rudoctors\worktrees\regional-seo` | `opencode/deepseek-v4.1-flash-free`, PID 64772, `ses_e5d68579effe819hwstPx7juML` | Запущен, PID жив; начато чтение данных/страниц | `free-model-attempt\regional-seo.*.log` | Аудит реальных городов, уникальности и thin-content; безопасный backlog/точечные улучшения; без пустых URL и выдуманных данных. |
| 4 content-trust | Отзывы, доверие, качество профилей, YMYL guides; `docs/SEO-CONTENT-TRUST-2026-11-03.md` | `agent/content-trust-2026-11-03` / `D:\Projects\rudoctors\worktrees\content-trust` | `opencode/flint-40b-free`, PID 65852, `ses_e5d685758ffeQ9DqatYLZjyDkP` | Запущен, PID жив; начато изучение проекта | `free-model-attempt\content-trust.*.log` | Происхождение и модерация отзывов; очередь редакционной доработки; методика без ложных AggregateRating; проверяемый план guides. |
| 5 maps-clinics | Карты, клиники, GBP/Яндекс Бизнес; `docs/SEO-MAPS-CLINICS-2026-11-03.md` | `agent/maps-clinics-2026-11-03` / `D:\Projects\rudoctors\worktrees\maps-clinics` | `opencode/glm-5.3-flash-free`, PID 35640, `ses_e5d68574cffevSiz2HcP4gPrtz` | Запущен, PID жив; начато изучение проекта | `free-model-attempt\maps-clinics.*.log` | Заключение без фиктивного адреса/профиля; сравнение API и лицензий; архитектура, основанная лишь на подтверждённых координатах. |
| 6 competitive-growth | Конкурент, домен, внешнее SEO и GEO; `docs/SEO-COMPETITIVE-GROWTH-2026-11-03.md` | `agent/competitive-growth-2026-11-03` / `D:\Projects\rudoctors\worktrees\competitive-growth` | `opencode/mimo-v2.6-flash-free`, PID 19096, `ses_e5d685734ffeHVm7p71Rav5xB7` | Запущен, PID жив; начато чтение проекта | `free-model-attempt\competitive-growth.*.log` | Сравнение с источниками без копирования; доменная стратегия без покупки/миграции; качественные каналы без спама; реалистичная GEO-стратегия. |

## Общие правила для повторного запуска

Все задания уже переданы launcher-скрипту. Каждый агент обязан: сначала изучить `README.md`, `STATE.md`, `TODO.md`, `docs/` и Git; работать только в своём worktree; не делать merge/push/deploy/покупки/создание публичных профилей; не раскрывать секреты или персональные данные; не выдумывать медицинские сведения, отзывы, адреса, аналитику и подтверждения; сохранять свой отчёт в ветке; запускать релевантные проверки после правок.

Задания 1, 2 и 6 требуют Neo Browser для авторизованных интерфейсов, только если он доступен агенту. При отсутствии авторизации или интеграции ограничение должно быть зафиксировано, а не обходиться.

### Корректировка прав Google Search Console (19:19 CET)

Агент 2 перезапущен с приоритетной задачей передачи владельца трёх URL-prefix properties: `https://rudoctors.github.io/`, `https://wellnessnd.github.io/`, `https://nd-science.github.io/`. Целевой владелец — `ivan.dolgov.hd@gmail.com`; доступ `thewayofdhd@gmail.com` подлежит удалению. Контрольная последовательность обязательна для каждого ресурса: проверить Users and permissions → подтвердить владельца целевой учётной записи → только после этого удалить прежнюю учётную запись → заново подтвердить доступ целевого владельца. Агенту запрещено менять GitHub ownership, Pages, DNS, deployment или verification token вслепую. При отсутствии нужной авторизации он должен остановиться и зафиксировать точный блокер/безопасное действие владельца.

## Проверяемый чек-лист

- [x] Изучены актуальные корень репозитория, документация, незавершённые задачи и последние коммиты.
- [x] Проверены OpenCode CLI, версия, модели и провайдеры.
- [x] Созданы шесть независимых веток и Git worktree.
- [x] Выполнены шесть независимых попыток запуска, записаны модели, PID, каталоги и логи.
- [x] Проверены неудачные попытки и зафиксированы причины отказа платных/credential-зависимых моделей.
- [x] Подготовлены самостоятельные задания и повторно запускаемый launcher.
- [x] Выбраны шесть совместимых бесплатных моделей.
- [x] Успешно запущены шесть агентов и подтверждено начало каждого по живому PID и логу.
- [ ] Дождаться отчётов, просмотреть diff всех веток, разрешить конфликты.
- [ ] Запустить интеграционные `npm run check`, `npm run build`, ссылки и Neo UI-проверку.
- [ ] Подготовить PR; не делать merge/deploy без отдельного согласования.

## Для следующей сессии

1. Следить за `D:\Projects\rudoctors\logs\seo-multiagent-2026-11-03\free-model-attempt\launch-records.json` и шестью парами stdout/stderr; не прерывать агентов без причины.
2. После завершения каждого агента проверить его отчёт и `git -C <worktree> status --short` / `git -C <worktree> diff`.
3. Затем выполнить описанный в мастер-задаче финальный этап: review шести веток, разрешение конфликтов, `npm run check`, `npm run build`, ссылки и Neo UI-проверку. Не делать merge/deploy без отдельного согласования.
4. Первые неудачные попытки не требуют восстановления ключей для текущей работы: бесплатные модели уже запущены. Не выводить и не обновлять credentials в логах или чате.
