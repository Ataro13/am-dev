-- ============================================================
-- AM.DEV — ОЧИСТКА ДУБЛИКАТОВ + ЗАЩИТА ОТ ПОВТОРОВ
-- Выполнить в: Supabase Dashboard → SQL Editor → New query → Run
-- Безопасен: повторный запуск ничего не сломает.
-- ============================================================

-- 1. Задачи: удаляем копии, оставляем одну строку на каждое название
delete from public.tasks a
using public.tasks b
where a.user_id = b.user_id
  and a.title   = b.title
  and a.id      > b.id;

-- 2. Новости: удаляем копии, оставляем одну строку на каждое название
delete from public.news a
using public.news b
where a.title = b.title
  and a.id    > b.id;

-- 3. Добавляем защиту от повторов (уникальность)
alter table public.tasks
  drop constraint if exists tasks_user_title_unique;
alter table public.tasks
  add constraint tasks_user_title_unique unique (user_id, title);

alter table public.news
  drop constraint if exists news_title_unique;
alter table public.news
  add constraint news_title_unique unique (title);

-- 4. Проверка результата (по желанию, можно не выполнять):
-- select title, status from public.tasks;
-- select title from public.news;
