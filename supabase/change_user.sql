-- ============================================================
-- AM.DEV — смена логина (email) и пароля клиента Бэлы
-- Новый вход: email dau-bela@yandex.ru / пароль Dau930
-- Выполнить целиком: Supabase Dashboard → SQL Editor → New query → Run
-- (Можно запускать повторно — повторный запуск ничего не сломает.)
-- ============================================================

-- ---------- 0. Проверка структуры (просто посмотреть, что изменится) ----------
-- Если в результатах у identities.email стоит GENERATED — это нормально,
-- так и должно быть: эта колонка сама берётся из identity_data.
select table_name, column_name, is_generated
from information_schema.columns
where table_schema = 'auth'
  and ((table_name = 'users' and column_name = 'email')
    or (table_name = 'identities' and column_name = 'email'));

-- ---------- 1. Меняем email в auth.users ----------
-- В новых версиях Supabase users.email может быть generated-колонкой
-- (тогда её менять нельзя — она сама берётся из identities ниже),
-- поэтому обновляем только если колонка обычная.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email'
      and is_generated = 'ALWAYS'
  ) then
    raise notice 'auth.users.email is generated — пропускаем (возьмётся из identities)';
  else
    update auth.users
    set email = 'dau-bela@yandex.ru',
        email_change = '',
        email_change_token_new = '',
        email_change_token_current = '',
        email_confirmed_at = now(),
        updated_at = now()
    where id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';
  end if;
end $$;

-- ---------- 2. Меняем email в привязке входа (identities) ----------
-- Без этого шага вход по новому email не сработает.
-- ВНИМАНИЕ: колонка identities.email — generated, напрямую её менять НЕЛЬЗЯ.
-- Она сама пересчитается из identity_data (шаг ниже).
update auth.identities
set provider_id = 'dau-bela@yandex.ru',
    identity_data = identity_data || jsonb_build_object('email', 'dau-bela@yandex.ru'),
    updated_at = now()
where user_id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f'
  and provider = 'email';

-- ---------- 3. Меняем пароль ----------
update auth.users
set encrypted_password = crypt('Dau930', gen_salt('bf')),
    updated_at = now()
where id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';

-- ---------- 4. Обновляем логин в профиле (раздел «Мои данные») ----------
update public.profiles
set username = 'dau-bela'
where id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';

-- ---------- 5. Проверка: что получилось ----------
-- Должно быть: users.email = dau-bela@yandex.ru,
-- identity_email = dau-bela@yandex.ru, username = dau-bela
select u.id,
       u.email as users_email,
       u.email_confirmed_at,
       i.provider_id,
       i.identity_data->>'email' as identity_email,
       p.username
from auth.users u
left join auth.identities i on i.user_id = u.id and i.provider = 'email'
left join public.profiles p on p.id = u.id
where u.id = 'fedca2a0-beaa-4862-bbe4-a5a30cf68a1f';
