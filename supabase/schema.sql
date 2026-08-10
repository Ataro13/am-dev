-- ============================================================
-- AM.DEV — Личный кабинет. Схема Supabase (PostgreSQL)
-- Выполнить целиком в: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- Профили клиентов ----------
-- Одна строка на клиента. Создаётся автоматически при создании
-- пользователя в Authentication (логин = часть email до @).
create table if not exists public.profiles (
  id             uuid primary key references auth.users on delete cascade,
  username       text unique not null,          -- логин клиента
  display_name   text,                          -- имя для приветствия
  site_url       text,                          -- сайт клиента
  contact        text,                          -- контакт (телефон/почта)
  project_status text,                          -- краткий статус проекта (для главной)
  last_seen_at   timestamptz,                   -- последняя активность (онлайн-статус)
  created_at     timestamptz not null default now()
);

-- Для уже созданных БД: добавляем колонку, если её ещё нет
-- (повторный запуск schema.sql безопасен).
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- ---------- Задачи проекта ----------
-- UNIQUE (user_id, title): защита от дублей при повторном запуске seed.sql.
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null,
  status     text not null default 'waiting' check (status in ('done', 'in progress', 'waiting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_user_title_unique unique (user_id, title)
);

-- ---------- Подписки ----------
-- status: 'active' — подписка оформлена, 'none' — нет подписки
-- (или просто отсутствие строки). Клиент видит только статус;
-- изменения вносит владелец через Table Editor.
create table if not exists public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  plan       text,                              -- тариф (например: «Стандарт»)
  status     text not null default 'none' check (status in ('active', 'none')),
  started_at date,
  expires_at date,
  price      numeric(10,2)                      -- ₽/мес
);

-- ---------- Новости (видны всем клиентам) ----------
-- UNIQUE (title): защита от дублей при повторном запуске seed.sql.
create table if not exists public.news (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint news_title_unique unique (title)
);

-- ---------- Посещения кабинета (история для владельца) ----------
-- Запись добавляется при каждом входе клиента в кабинет.
-- «Онлайн сейчас» считается по profiles.last_seen_at (свежее 2 минут),
-- а эта таблица хранит историю визитов.
create table if not exists public.visits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  visited_at timestamptz not null default now()
);

-- ---------- Автосоздание профиля при регистрации пользователя ----------
-- Логин клиента = часть email до «@» (в панели создаёте email вида
-- <логин>@amdev.local, клиент вводит просто <логин>).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Триггерная функция не должна быть вызываемой извне (только триггером)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- Безопасность (Row Level Security) ----------
-- Клиент видит/меняет только свои данные. Владелец работает
-- через Dashboard — служебный ключ обходит RLS.

alter table public.profiles     enable row level security;
alter table public.tasks        enable row level security;
alter table public.subscriptions enable row level security;
alter table public.news         enable row level security;
alter table public.visits       enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Клиент обновляет свою строку профиля (heartbeat: last_seen_at каждые ~30 с)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Владелец (роль owner) видит профили всех клиентов — для дашборда «онлайн»
drop policy if exists "profiles_select_owner" on public.profiles;
create policy "profiles_select_owner" on public.profiles
  for select to authenticated using (auth.jwt() ->> 'role' = 'owner');

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "news_select_auth" on public.news;
create policy "news_select_auth" on public.news
  for select to authenticated using (true);

-- Визиты: клиент добавляет и видит только свои
drop policy if exists "visits_insert_own" on public.visits;
create policy "visits_insert_own" on public.visits
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "visits_select_own" on public.visits;
create policy "visits_select_own" on public.visits
  for select to authenticated using (auth.uid() = user_id);

-- Владелец (роль owner) видит историю посещений всех клиентов
drop policy if exists "visits_select_owner" on public.visits;
create policy "visits_select_owner" on public.visits
  for select to authenticated using (auth.jwt() ->> 'role' = 'owner');

-- ---------- Доступ к таблицам через Data API (REST) ----------
-- GRANT даёт доступ к таблицам как таковым; какие строки видны —
-- решает RLS выше (аноним не увидит ничего, клиент — только свои).
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant update on public.profiles to authenticated;   -- heartbeat last_seen_at
grant insert, select on public.visits to authenticated;
alter default privileges in schema public
  grant select on tables to anon, authenticated;

-- ---------- Индексы ----------
create index if not exists tasks_user_idx      on public.tasks (user_id);
create index if not exists subs_user_idx       on public.subscriptions (user_id);
create index if not exists news_created_idx    on public.news (created_at desc);
create index if not exists visits_user_idx     on public.visits (user_id, visited_at desc);
