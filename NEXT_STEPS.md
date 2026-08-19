# ПРОДОЛЖЕНИЕ НАСТРОЙКИ SUPABASE (личный кабинет AM.DEV)

> Прочитай этот файл первым делом после перезапуска opencode и выполни
> шаги из раздела «ПЛАН ДЕЙСТВИЙ» по порядку. Это продолжение работы —
> всё, что было сделано до перезапуска, описано ниже.

## 1. Контекст проекта

- Сайт AM.DEV (статический, E:\WORKFLOW\AM-DEV): index.html, cabinet.html и др.
- Личный кабинет клиента полностью переделан: старый (вход по коду из
  data/client-001.json) удалён, новый работает на Supabase (авторизация +
  PostgreSQL + RLS).
- Существующий клиент: **Бэла Даудова**. Вход: email `dau-bela@yandex.ru`
  (или логин `dau-bela`), пароль `Dau930`. Логин-суффикс `@amdev.local` —
  только fallback, если клиент ввёл логин без `@`.
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
      → fix_duplicates.sql ВЫПОЛНЕН владельцем; защита от дублей перенесена
      в schema.sql (UNIQUE: tasks(user_id,title), news(title)), seed.sql
      идемпотентен (ON CONFLICT DO NOTHING). Файл fix_duplicates.sql
      удалён из репозитория (лишний).
- [x] **Шаг 6 выполнен**: сквозная проверка кабинета в браузере пройдена:
      вход `dau170930` → Главная (приветствие, карточки) → Задачи
      (пустое состояние) → Подписка («не оформлена» + кнопка Telegram) →
      Мои данные (логин, дата) → Выход. Все разделы работают корректно.
- [x] **Шаг 7 выполнен**: финальный отчёт + коммит `a8a1267` (+пуш).
- [x] **Смена логина клиента (по просьбе владельца)**:
      владелец попросил вход по реальной почте вместо `@amdev.local`.
      Код `js/cabinet.js` уже умел полный email; форма переименована
      в «Логин или email», в «Мои данные» добавлен Email из сессии,
      ошибки входа обновлены. Данные клиента теперь:
      email `dau-bela@yandex.ru`, пароль `Dau930`, username `dau-bela`.
      ⚠️ В новой версии Dashboard кнопки «Update user» НЕТ (проверено по
      исходникам Supabase Studio) — только Reset password (письмо) /
      Ban / Delete. → Создан `supabase/change_user.sql` (смена email +
      пароль + username одним скриптом, идемпотентен). Владельцу дан
      Шаг 8 в OWNER_GUIDE.md (вставить скрипт в SQL Editor → Run).
- [x] **Смена логина клиента — скрипт выполнен**:
      владелец повторно запустил `change_user.sql` (переписанную версию) —
      вход работает по email `dau-bela@yandex.ru` + пароль `Dau930`
      (проверено в браузере 10.08.2026). Логин `dau-bela` (без суффикса)
      больше не работает — смена email завершена.
- [x] **Онлайн-панель владельца (код готов, БД ждёт применения)**:
      - `supabase/schema.sql` обновлён: в `profiles` добавлена колонка
        `last_seen_at timestamptz`, создана таблица `visits`
        (user_id → auth.users, visited_at по умолчанию now(), индекс,
        RLS insert/select для authenticated; GRANT на insert для anon нет).
        Повторный запуск schema.sql безопасен (IF NOT EXISTS / DO).
      - `js/cabinet.js`: при успешном входе пишется визит в `visits`,
        пока кабинет открыт — heartbeat каждые 30 с обновляет
        `profiles.last_seen_at` (клиент «онлайн», пока активность
        свежее 2 минут). node --check ОК.
      - Новые файлы: `owner/online.html` + `owner/online.js` — панель
        владельца: кто онлайн сейчас + история посещений (последние 50),
        автообновление 15 с. Доступ только с ролью `owner` (claim из JWT),
        noindex. node --check ОК.
      - `supabase/OWNER_GUIDE.md`: добавлен Шаг 9 «Онлайн-пользователи»
        (применить schema.sql → создать аккаунт владельца → назначить
        роль owner → открыть https://am-dev.relaxdev.ru/owner/online.html).
      - ЖДЁТ: применения schema.sql владельцем + создания аккаунта
        владельца и роли owner + коммита (изменения не закоммичены).

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
| supabase/change_user.sql | Смена email/пароля/логина клиента (Шаг 8) — ВЫПОЛНЕНО |
| supabase/schema.sql | Схема БД (+ last_seen_at, visits) — повторно применить в Шаге 9 |
| supabase/OWNER_GUIDE.md | Подробная пошаговая инструкция для владельца (без тех. знаний) + Шаг 9 «Онлайн-пользователи» |
| owner/online.html | Панель владельца: кто онлайн + история посещений (роль owner) |
| owner/online.js | Логика панели (JWT-роль, автообновление 15 с) |
| NEXT_STEPS.md | Этот файл |

## 5. Важные детали

- Клиент вводит при входе **email целиком** (например `dau-bela@yandex.ru`)
  ИЛИ логин без `@` (например `dau-bela`) — код сам добавит суффикс
  `@amdev.local` (LOGIN_SUFFIX), чтобы найти пользователя.
- anon key — публичный, безопасно вставлять в код. service_role НЕ
  использовать в клиенте никогда.
- RLS: клиент видит только свои строки (auth.uid() = user_id); новости
  — все авторизованные.
- Онлайн-статус: `profiles.last_seen_at` обновляет сам клиент (heartbeat
  30 с); панель владельца считает «онлайн» = активность свежее 2 минут.
  `visits` — лог входов (user_id, visited_at) для истории посещений.
- Изменения в git не коммитились — по завершении спросить владельца,
  коммитить ли.

## 6. Как менять данные клиентов (чек-лист для будущих сессий)

> Все изменения данных — через SQL Editor в Dashboard владельца.
> MCP Supabase НЕ авторизован → ручной путь.

### 6.1. Клиенты и их user_id

| Клиент | email | user_id | username |
|---|---|---|---|
| Бэла Даудова | dau-bela@yandex.ru | fedca2a0-beaa-4862-bbe4-a5a30cf68a1f | dau-bela |

При создании нового клиента:
1. Dashboard → Authentication → Users → Add user (email `<логин>@amdev.local`,
   пароль — сгенерировать и передать владельцу).
2. Триггер `handle_new_user()` автоматически создаёт строку в `profiles`
   (username = часть email до `@`).
3. Данные (задачи, подписка) — добавлять через SQL (см. ниже).

### 6.2. Изменение профиля (profiles)

```sql
-- Изменить имя / статус проекта / сайт / контакт
UPDATE public.profiles
SET display_name   = 'Новое Имя',
    project_status = 'Новый статус',
    site_url       = 'https://example.com',
    contact        = '+7 (999) 123-45-67'
WHERE id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';
```

### 6.3. Управление подпиской (subscriptions)

Структура таблицы `subscriptions`:
- `user_id` (uuid, UNIQUE) — привязка к пользователю
- `plan` (text) — тариф: «Базовый», «Стандарт», «Профи» и т.д.
- `status` (text) — `'active'` или `'none'`
- `started_at` (date) — дата начала
- `expires_at` (date) — дата окончания
- `price` (numeric) — стоимость ₽/мес
- `hours_left` (numeric) — оставшиеся часы
- `hours_total` (numeric) — общее кол-во часов в тарифе

```sql
-- Назначить/обновить подписку (идемпотентно — ON CONFLICT)
INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at, price, hours_left, hours_total)
VALUES (
  'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f',  -- user_id клиента
  'Базовый',                                  -- тариф
  'active',                                   -- статус
  '2026-08-17',                               -- начало
  '2026-09-17',                               -- окончание
  NULL,                                       -- стоимость (или число)
  1.3,                                        -- остаток часов
  10.0                                        -- всего часов в тарифе
)
ON CONFLICT (user_id) DO UPDATE SET
  plan        = EXCLUDED.plan,
  status      = EXCLUDED.status,
  started_at  = EXCLUDED.started_at,
  expires_at  = EXCLUDED.expires_at,
  price       = EXCLUDED.price,
  hours_left  = EXCLUDED.hours_left,
  hours_total = EXCLUDED.hours_total;
```

```sql
-- Продлить подписку (сдвинуть дату окончания)
UPDATE public.subscriptions
SET expires_at = '2026-10-17',
    hours_left = 5.0
WHERE user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f'
  AND status = 'active';
```

```sql
-- Деактивировать подписку
UPDATE public.subscriptions
SET status = 'none'
WHERE user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';
```

```sql
-- Проверить подписку клиента
SELECT s.plan, s.status, s.started_at, s.expires_at,
       s.hours_left, s.hours_total, s.price,
       p.display_name
FROM public.subscriptions s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';
```

### 6.4. Управление задачами (tasks)

Структура: `user_id`, `title`, `status` (`'done'` / `'in progress'` / `'waiting'`).
Уникальность: `UNIQUE (user_id, title)`.

```sql
-- Добавить задачу
INSERT INTO public.tasks (user_id, title, status)
VALUES ('fedca2a0-beaa-4862-bbe4-a5a30cf68a1f', 'Новая задача', 'waiting')
ON CONFLICT (user_id, title) DO NOTHING;

-- Изменить статус задачи
UPDATE public.tasks
SET status = 'done', updated_at = now()
WHERE user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f'
  AND title = 'Новая задача';

-- Удалить задачу
DELETE FROM public.tasks
WHERE user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f'
  AND title = 'Новая задача';

-- Список задач клиента
SELECT title, status, created_at FROM public.tasks
WHERE user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f'
ORDER BY created_at;
```

### 6.5. Новости (news)

Видны **всем** авторизованным клиентам. Уникальность: `UNIQUE (title)`.

```sql
-- Добавить новость
INSERT INTO public.news (title, body)
VALUES ('Заголовок', 'Текст новости')
ON CONFLICT (title) DO NOTHING;

-- Удалить новость
DELETE FROM public.news WHERE title = 'Заголовок';
```

### 6.6. Смена email / пароля клиента

См. `supabase/change_user.sql` — идемпотентный скрипт, меняет email,
пароль и username одним запросом. Подставить нужные значения.

### 6.7. Полезные запросы

```sql
-- Все клиенты с подписками
SELECT p.display_name, p.username, s.plan, s.status, s.hours_left, s.hours_total
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
ORDER BY p.display_name;

-- Клиенты без подписки
SELECT p.display_name, p.username
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
WHERE s.id IS NULL;

-- Посещения клиента (последние 10)
SELECT visited_at FROM public.visits
WHERE user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f'
ORDER BY visited_at DESC LIMIT 10;
```
