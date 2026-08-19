-- ============================================================
-- AM.DEV — назначение подписки клиенту Бэл Даудова
-- Тариф: Базовый · Период: 17.08.2026 — 17.09.2026
-- Остаток: 1.3ч из 10ч
-- Выполнить: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- 0. Добавляем колонки, если их ещё нет ----------
-- (повторный запуск безопасен — IF NOT EXISTS)
alter table public.subscriptions add column if not exists hours_left  numeric(4,1);
alter table public.subscriptions add column if not exists hours_total numeric(4,1);

-- ---------- 1. Вставляем подписку ----------
-- user_id клиента: fedca2a0-beaa-4862-bbe4-a5a30cf68a1f
insert into public.subscriptions (user_id, plan, status, started_at, expires_at, price, hours_left, hours_total)
values (
  'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f',
  'Базовый',
  'active',
  '2026-08-17',
  '2026-09-17',
  NULL,       -- стоимость можно добавить позже
  1.3,        -- оставшиеся часы
  10.0        -- общее кол-во часов в тарифе
)
on conflict (user_id) do update set
  plan        = excluded.plan,
  status      = excluded.status,
  started_at  = excluded.started_at,
  expires_at  = excluded.expires_at,
  price       = excluded.price,
  hours_left  = excluded.hours_left,
  hours_total = excluded.hours_total;

-- ---------- 2. Проверка ----------
select s.plan, s.status, s.started_at, s.expires_at,
       s.hours_left, s.hours_total,
       p.display_name, p.username
from public.subscriptions s
join public.profiles p on p.id = s.user_id
where s.user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';
