-- ============================================================
-- AM.DEV — стартовые данные для клиента Бэла Даудова (dau-bela)
-- Выполнить ПОСЛЕ создания пользователя в Authentication
-- (Supabase Dashboard → SQL Editor → New query → Run)
-- ============================================================

-- ---------- 1. Профиль клиента: имя и статус проекта ----------
-- username и id создаются автоматически; здесь дополняем данные.
insert into public.profiles (id, username, display_name, project_status)
select id, 'dau-bela', 'Бэла Даудова', 'Идёт разработка сайта'
from auth.users
where email = 'dau-bela@yandex.ru'
on conflict (id) do update set
  display_name  = excluded.display_name,
  project_status = excluded.project_status;

-- ---------- 2. Задачи клиента ----------
-- Структура: user_id (берётся автоматически), title, status.
-- on conflict: повторный запуск не создаёт дубликаты
-- (уникальность (user_id, title) задана в schema.sql).
insert into public.tasks (user_id, title, status)
select id, 'Разработка и вёрстка сайта', 'in progress'
from auth.users where email = 'dau-bela@yandex.ru'
on conflict (user_id, title) do nothing;

insert into public.tasks (user_id, title, status)
select id, 'Подключение личного кабинета', 'done'
from auth.users where email = 'dau-bela@yandex.ru'
on conflict (user_id, title) do nothing;

-- ---------- 3. Новости (видны всем клиентам) ----------
-- on conflict: повторный запуск не создаёт дубликаты
-- (требует constraint news_title_unique из schema.sql).
insert into public.news (title, body) values
  ('Добро пожаловать в личный кабинет!',
   'Здесь вы видите статус вашего проекта, задачи и подписку — всё в одном месте. По любым вопросам пишите нам в Telegram.'),
  ('Мы на связи',
   'Поддержка AM.DEV отвечает в Telegram: @realarturmel. Режим работы: ежедневно.')
on conflict (title) do nothing;

-- ---------- 4. Проверка (не обязательно) ----------
-- select id, username, display_name, project_status from public.profiles;
-- select title, status from public.tasks;
-- select title from public.news;
