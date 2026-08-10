# ПРОДОЛЖЕНИЕ НАСТРОЙКИ SUPABASE (личный кабинет AM.DEV)

> Прочитай этот файл первым делом после перезапуска opencode и выполни
> шаги из раздела «ПЛАН ДЕЙСТВИЙ» по порядку. Это продолжение работы —
> всё, что было сделано до перезапуска, описано ниже.

## 1. Контекст проекта

- Сайт AM.DEV (статический, E:\WORKFLOW\AM-DEV): index.html, cabinet.html и др.
- Личный кабинет клиента полностью переделан: старый (вход по коду из
  data/client-001.json) удалён, новый работает на Supabase (авторизация +
  PostgreSQL + RLS).
- Существующий клиент: **Бэла Даудова**, логин `dau170930`, логин-суффикс `@amdev.local`.
- Supabase-проект УЖЕ создан владельцем: **project_ref = `xnispyospechwcbmvujx`**,
  URL: `https://xnispyospechwcbmvujx.supabase.co`.

## 2. Что уже сделано (до перезапуска) — НЕ повторять

- [x] MCP Supabase добавлен в конфиг opencode:
      `C:\Users\user2\.config\opencode\opencode.json` → блок `mcp.supabase`
      (type: remote, url с project_ref=xnispyospechwcbmvujx, enabled: true).
- [x] Скиллы установлены: `supabase`, `supabase-postgres-best-practices`
      в `C:\Users\user2\.agents\skills\`. При работе с базой — загрузить
      скилл: `skill(name="supabase")`.
- [x] `supabase/schema.sql` готов и выверен по best practices:
      таблицы profiles/tasks/subscriptions/news, триггер автосоздания
      профиля, RLS, GRANT для Data API (anon/authenticated),
      revoke execute на триггерную функцию.
      Примечание: политика задач изменена на `tasks_select_own`
      (клиент только читает задачи, без права записи).
- [x] `js/cabinet-config.js` — плейсхолдеры SUPABASE_URL / SUPABASE_ANON_KEY
      (пустые строки) + LOGIN_SUFFIX "@amdev.local".
- [x] `js/vendor/supabase.global.js` — SDK собран локально.
- [x] `js/cabinet.js`, `cabinet.html` — логика кабинета (вход по логину+паролю,
      разделы: Главная/Задачи/Подписка/Мои данные, выход, кнопка
      «Оформить подписку» → https://t.me/realarturmel).
- [x] Проверено: node --check (синтаксис ОК), мок-рендер в браузере ОК.

## 2.5. Что сделано В ЭТОЙ сессии (после перезапуска)

- [x] **MCP Supabase НЕ авторизован** (OAuth не пройден, инструменты не
      загружены; сервер mcp.supabase.com доступен — 401). CLI `supabase`
      не установлен. → Выбран ручной путь через Dashboard владельца.
- [x] **Шаг 2 выполнен**: `supabase/schema.sql` применён владельцем через
      SQL Editor («Success. No rows returned»). Файл перед этим пересохранён
      в CRLF/UTF-8 (без BOM) — старый LF ломал копирование из Блокнота.
- [x] **Шаг 3 выполнен**: ключи вписаны в `js/cabinet-config.js`:
      SUPABASE_URL = "https://xnispyospechwcbmvujx.supabase.co",
      SUPABASE_ANON_KEY = "sb_publishable_be1m8AGC2yj77JqZ2W6GPg_2yS099W6"
      (НОВЫЙ формат publishable-ключа — SDK поддерживает, проверено).
      Проверено API-запросом: аноним → 200 + пустой список (RLS работает).
- [x] **Шаг 4 выполнен**: пользователь создан владельцем
      (Authentication → Users): email `dau170930@amdev.local`,
      пароль `Dau!930-amdev-2026` (передать клиенту Бэле Даудовой).
      Вход через API подтверждён (200, access_token получен).
      Триггер создал профиль: username='dau170930', id=fedca2a0-beaa-4862-bbe4-a5a30cf68a1f.
- [x] **Шаг 5 выполнен**: `supabase/seed.sql` выполнен владельцем.
      Данные на месте (проверено API): display_name='Бэла Даудова',
      project_status='Идёт разработка сайта', задачи 2 шт, новости 2 шт.
      НО: seed.sql был запущен ДВАЖДЫ → появились дубликаты
      (задачи ×2, новость «Добро пожаловать» ×2).
      → Создан `supabase/fix_duplicates.sql`: удаляет дубли и добавляет
      UNIQUE-ограничения (tasks(user_id,title), news(title)), чтобы
      повторные запуски seed.sql были безопасны. seed.sql обновлён
      (добавлен ON CONFLICT DO NOTHING — теперь идемпотентен).
      ЖДЁТ выполнения fix_duplicates.sql владельцем.
- [x] **Шаг 6 выполнен**: сквозная проверка кабинета в браузере пройдена:
      вход `dau170930` → Главная (приветствие, карточки) → Задачи
      (пустое состояние) → Подписка («не оформлена» + кнопка Telegram) →
      Мои данные (логин, дата) → Выход. Все разделы работают корректно.
- [ ] **Шаг 7**: финальный отчёт + коммит (спросить владельца).

## 3. ПЛАН ДЕЙСТВИЙ (выполнить по порядку)

### Шаг 1. Проверить подключение MCP Supabase
- Вызови: `skill_mcp(mcp_name="supabase", tool_name="list_tools")`.
- Если «not found» — MCP не авторизован. Тогда:
  - Попроси пользователя перезапустить opencode ещё раз и пройти
    OAuth-авторизацию Supabase в браузере (войти в аккаунт supabase.com
    и подтвердить доступ). Затем снова проверить.
  - АЛЬТЕРНАТИВА (использована в этой сессии): ручной путь через
    Dashboard владельца + проверка через REST API с publishable-ключом
    (см. раздел 2.5). Инструкция: `supabase/OWNER_GUIDE.md`.
- Если MCP отвечает — перейти к шагу 2.

### Шаг 2. Применить схему базы
- Выполнить содержимое `supabase/schema.sql` целиком через
  `skill_mcp(mcp_name="supabase", tool_name="...execute_sql...", arguments={sql: <текст schema.sql>})`.
  Имя инструмента уточнить через list_tools (например supabase_database_execute_sql).
- Ожидаемый результат: созданы 4 таблицы, триггер, 5 политик RLS, индексы, GRANT.
- Верификация: запрос `select count(*) from information_schema.tables
  where table_schema='public' and table_name in ('profiles','tasks','subscriptions','news');`
  → должно вернуть 4.

### Шаг 3. Получить ключи проекта и вписать их в конфиг
- Через MCP найти инструменты получения API-ключей проекта
  (например supabase_account_get_project_api_keys или аналогичный
  в списке tools). ИЛИ попросить владельца скопировать из
  Dashboard → Project Settings → API (Project URL + anon public key).
- Записать в `js/cabinet-config.js`:
  - SUPABASE_URL = "https://xnispyospechwcbmvujx.supabase.co"
  - SUPABASE_ANON_KEY = "<anon key>"
- Сохранить файл, проверить `node --check` на cabinet-config.js (можно
  через `node -e "new Function(require('fs').readFileSync('js/cabinet-config.js','utf8')); console.log('ok')"`).

### Шаг 4. Создать пользователя клиента
- Создать в Auth пользователя: email `dau170930@amdev.local`, пароль —
  сгенерировать надёжный (не менее 12 символов), записать и СООБЩИТЬ
  владельцу (он передаст клиенту).
- Способ: через MCP (если есть инструмент создания пользователя) ИЛИ
  попросить владельца: Dashboard → Authentication → Users → Add user.
  Владельцу удобнее самому — он же будет выдавать пароль клиенту.
- После создания — проверить, что триггер создал профиль:
  `select id, username from public.profiles;` → должна появиться строка
  с username='dau170930'.

### Шаг 5. Заполнить данные клиента
- В `public.profiles` для user_id клиента:
  display_name = 'Бэла Даудова', project_status = краткий статус проекта.
  site_url / contact — уточнить у владельца (данные старого кабинета
  удалены вместе с data/; не выдумывать).
- В `public.tasks` — задачи клиента (уточнить у владельца или оставить
  пустыми; структура: user_id, title, status in ('done','in progress','waiting')).
- В `public.subscriptions` — строка с user_id, plan, status,
  started_at/expires_at, price (уточнить у владельца; можно начать
  с status='none' и без строки — кабинет корректно покажет
  «подписка не оформлена»).
- В `public.news` — 1–2 записи (title, body) — видны всем клиентам.

### Шаг 6. Сквозная проверка в браузере
- Запустить локальный сервер: `python -m http.server 8899` (из E:\WORKFLOW\AM-DEV).
- Открыть `http://localhost:8899/cabinet.html` (через playwright/browser MCP):
  1. Вход `dau170930` + пароль → попасть в кабинет.
  2. Раздел Главная — приветствие с именем, статус, новости.
  3. Раздел Задачи — список (или пустое состояние).
  4. Раздел Подписка — статус + кнопка «Оформить подписку» (t.me/realarturmel).
  5. Раздел Мои данные — имя/сайт/контакт/логин.
  6. Выход → вернуться к форме входа.
- Зафиксировать скриншоты/результат в отчёте владельцу.

### Шаг 7. Финальный отчёт владельцу
- Что развёрнуто (схема, ключи, пользователь, данные).
- Пароль клиента (dau170930) — передать владельцу.
- Как дальше создавать клиентов: Authentication → Users → Add user
  (email `<логин>@amdev.local`, пароль выдать клиенту); профиль создастся
  сам; задачи/подписки/новости — в Table Editor.
- Обновить `supabase/SETUP.md`, если он противоречит (теперь всё
  развёрнуто, ключи вписаны — пометить «выполнено»).

## 4. Карта файлов

| Файл | Назначение |
|---|---|
| cabinet.html | Страница входа + SPA-кабинет |
| js/cabinet.js | Вся логика кабинета |
| js/cabinet-config.js | Ключи Supabase (вставить в Шаге 3) |
| js/vendor/supabase.global.js | SDK (локально, без CDN) |
| supabase/schema.sql | Схема БД (применить в Шаге 2) — ВЫПОЛНЕНО |
| supabase/seed.sql | Стартовые данные клиента (Шаг 5) — ВЫПОЛНЕНО (идемпотентен, ON CONFLICT) |
| supabase/fix_duplicates.sql | Очистка дублей + UNIQUE-ограничения — ЖДЁТ выполнения владельцем |
| supabase/SETUP.md | Инструкция для владельца |
| supabase/OWNER_GUIDE.md | Подробная пошаговая инструкция для владельца (без тех. знаний) |
| NEXT_STEPS.md | Этот файл |

## 5. Важные детали

- Клиент вводит при входе только ЛОГИН (`dau170930`), суффикс
  `@amdev.local` добавляет код (LOGIN_SUFFIX).
- anon key — публичный, безопасно вставлять в код. service_role НЕ
  использовать в клиенте никогда.
- RLS: клиент видит только свои строки (auth.uid() = user_id); новости
  — все авторизованные.
- Изменения в git не коммитились — по завершении спросить владельца,
  коммитить ли.
