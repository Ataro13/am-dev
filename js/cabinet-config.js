/* ============================================================
   AM.DEV — Личный кабинет: конфигурация Supabase
   ============================================================
   1. Создайте проект на https://supabase.com (бесплатно)
   2. Project Settings → API:
      - Project URL  → SUPABASE_URL
      - anon public  → SUPABASE_ANON_KEY
   3. Выполните supabase/schema.sql в SQL Editor
   4. Создавайте клиентов: Authentication → Users → Add user
      (email — реальная почта клиента, пароль — выдаёте клиенту)
   Подробная инструкция: supabase/SETUP.md
   ============================================================ */
window.AM_CABINET = Object.assign(
  {
    /* Project URL из настроек проекта Supabase */
    SUPABASE_URL: "https://xnispyospechwcbmvujx.supabase.co",

    /* anon public key (публичный, можно вставлять в код) */
    SUPABASE_ANON_KEY: "sb_publishable_be1m8AGC2yj77JqZ2W6GPg_2yS099W6",

    /* Суффикс, который добавляется к логину при входе.
       Клиент вводит полный email ИЛИ просто логин (часть email до @):
       - если введено с «@» — используется как есть (реальная почта);
       - если без «@» — добавляется этот суффикс.
       Для входа по реальному email (например bela@yandex.ru) суффикс
       не нужен — пользователь вводит email целиком. */
    LOGIN_SUFFIX: "@amdev.local"
  },
  window.AM_CABINET || {}
);
