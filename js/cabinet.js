/* ============================================================
   AM.DEV — cabinet.js
   Личный кабинет на Supabase: вход по логину/паролю,
   разделы: Главная · Задачи · Подписка · Мои данные.
   Vanilla JS · IIFE · без зависимостей (кроме supabase.global.js)
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.AM_CABINET || {};
  var SUPABASE_URL = CFG.SUPABASE_URL || "";
  var SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "";
  var LOGIN_SUFFIX = CFG.LOGIN_SUFFIX || "@amdev.local";
  var SUPPORT_TG = "https://t.me/realarturmel";

  var app = document.getElementById("cabinetApp");
  if (!app) return;

  var configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  var supabase = configured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /* Состояние кабинета */
  var profile = null;      // строка profiles
  var clientEmail = "";    // email из сессии (для раздела «Мои данные»)
  var tasks = [];          // задачи
  var subscription = null; // подписка (строка или null)
  var news = [];           // новости
  var view = "home";       // home | tasks | sub | profile

  /* Статусы задач: поле tasks.status → глиф + подпись */
  var STATUS = {
    "done":        { glyph: "\u2713", label: "готово" },
    "in progress": { glyph: "\u25CF", label: "в работе" },
    "waiting":     { glyph: "\u25D0", label: "ждёт проверки" }
  };

  /* ---------- Утилиты ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function revealIn(node) {
    node.classList.add("reveal");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { node.classList.add("in"); });
    });
  }

  function fmtDate(d) {
    if (!d) return "";
    var date = new Date(d);
    if (isNaN(date)) return String(d);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", year: "numeric"
    });
  }

  function fmtMoney(n) {
    var v = Number(n);
    if (isNaN(v)) return String(n);
    return v.toLocaleString("ru-RU") + " \u20BD";
  }

  function statusOf(key) {
    return STATUS[key] || { glyph: "\u25B7", label: key || "" };
  }

  /* ---------- Рендер: конфиг не заполнен ---------- */

  function renderNotConfigured() {
    app.innerHTML = "";
    var box = el("div", "cab-login reveal");
    box.innerHTML =
      '<p class="cab-login-eyebrow">// кабинет</p>' +
      '<h2 class="cab-login-title">Кабинет не настроен</h2>' +
      '<p class="cab-sec-body">Вставьте ключи Supabase в <code>js/cabinet-config.js</code> и выполните схему из <code>supabase/schema.sql</code>. Инструкция: <code>supabase/SETUP.md</code>.</p>';
    app.appendChild(box);
    revealIn(box);
  }

  /* ---------- Рендер: экран входа ---------- */

  function renderLogin(errMsg) {
    app.innerHTML = "";
    var card = el("div", "cab-login reveal");
    card.innerHTML =
      '<p class="cab-login-eyebrow">// доступ по паролю</p>' +
      '<h2 class="cab-login-title">Вход в кабинет</h2>' +
      '<form class="cab-login-form" autocomplete="on">' +
      '  <div class="cab-field">' +
      '    <label for="cabLogin">Логин или email</label>' +
      '    <input class="cab-input" id="cabLogin" name="login" type="text" autocomplete="username" placeholder="Логин или email" spellcheck="false" required>' +
      '    <p class="cab-hint">Логин или email указан в договоре на обслуживание</p>' +
      '  </div>' +
      '  <div class="cab-field" style="margin-top:1.1rem">' +
      '    <label for="cabPass">Пароль</label>' +
      '    <input class="cab-input" id="cabPass" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required>' +
      '    <p class="cab-hint">Пароль выдаёт AM.DEV вместе с логином</p>' +
      '  </div>' +
      '  <p class="cab-err" role="status" aria-live="polite"></p>' +
      '  <button class="btn btn-primary cab-submit" type="submit"><span class="cab-btn-label">// Войти</span> <span aria-hidden="true">\u2192</span></button>' +
      '</form>';

    app.appendChild(card);

    var form = card.querySelector("form");
    var login = card.querySelector("#cabLogin");
    var pass = card.querySelector("#cabPass");
    var errEl = card.querySelector(".cab-err");
    var btn = card.querySelector(".cab-submit");
    var label = card.querySelector(".cab-btn-label");

    function setError(msg) {
      errEl.textContent = msg;
      errEl.classList.add("show");
    }

    if (errMsg) setError(errMsg);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      var l = login.value.trim();
      var p = pass.value;
      if (!l || !p) {
        setError("// Введите логин (или email) и пароль");
        return;
      }
      errEl.textContent = "";
      errEl.classList.remove("show");
      btn.disabled = true;
      label.textContent = "// проверяю…";
      doLogin(l, p)
        .catch(function () {})
        .then(function () {
          btn.disabled = false;
          label.textContent = "// Войти";
        });
    });

    revealIn(card);
    if (login.value) pass.focus(); else login.focus();
  }

  /* ---------- Рендер: загрузка / ошибка ---------- */

  function renderLoading(text) {
    app.innerHTML = "";
    var box = el("div", "cab-loading reveal");
    box.innerHTML = '<span class="cab-loading-text">' + esc(text || "// загрузка…") + '</span><span class="cab-caret" aria-hidden="true"></span>';
    app.appendChild(box);
    revealIn(box);
  }

  function renderError(msg) {
    app.innerHTML = "";
    var box = el("div", "cab-login cab-login--fatal reveal");
    box.innerHTML =
      '<p class="cab-login-eyebrow">// ошибка</p>' +
      '<h2 class="cab-login-title">Данные недоступны</h2>' +
      '<p class="cab-err show">' + esc(msg || "// Не удалось загрузить данные.") + '</p>' +
      '<button class="btn btn-ghost" type="button">Повторить</button>';
    box.querySelector("button").addEventListener("click", loadCabinet);
    app.appendChild(box);
    revealIn(box);
  }

  /* ---------- Авторизация ---------- */

  function doLogin(login, password) {
    var email = login.toLowerCase().indexOf("@") === -1
      ? login.toLowerCase() + LOGIN_SUFFIX
      : login.toLowerCase();
    return supabase.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        loadCabinet();
      })
      .catch(function (err) {
        renderLogin("// Неверный логин (или email) или пароль");
        console.error("cabinet: signIn failed", err);
      });
  }

  function doLogout() {
    supabase.auth.signOut()
      .catch(function (err) { console.error("cabinet: signOut failed", err); })
      .then(function () {
        profile = null; tasks = []; subscription = null; news = [];
        renderLogin();
      });
  }

  /* ---------- Загрузка данных ---------- */

  function loadCabinet() {
    renderLoading("// открываю кабинет…");

    var reqs = [
      supabase.auth.getSession().then(function (r) { return r; }),
      supabase.from("profiles").select("*").single().then(function (r) {
        if (r.error) throw r.error;
        profile = r.data;
      }),
      supabase.from("tasks").select("*").order("created_at").then(function (r) {
        if (r.error) throw r.error;
        tasks = r.data || [];
      }),
      supabase.from("subscriptions").select("*").maybeSingle().then(function (r) {
        if (r.error) throw r.error;
        subscription = r.data || null;
      }),
      supabase.from("news").select("*").order("created_at", { ascending: false }).limit(3).then(function (r) {
        if (r.error) throw r.error;
        news = r.data || [];
      })
    ];

    Promise.all(reqs)
      .then(function (results) {
        var sess = results[0].data;
        if (!sess || !sess.session) {
          renderLogin();
          return;
        }
        clientEmail = sess.session.user && sess.session.user.email ? sess.session.user.email : "";
        view = "home";
        renderCabinet();
      })
      .catch(function (err) {
        console.error("cabinet: load failed", err);
        renderError("// Не удалось загрузить данные. Проверьте сеть и попробуйте ещё раз.");
      });
  }

  /* ---------- Рендер: кабинет ---------- */

  function renderCabinet() {
    app.innerHTML = "";
    var name = (profile && (profile.display_name || profile.username)) || "клиент";

    var wrap = el("div", "cab-dash reveal");
    wrap.innerHTML =
      '<div class="cab-head">' +
      '  <div class="cab-head-title">// КАБИНЕТ · ' + esc(name) + '</div>' +
      '  <button class="btn btn-ghost cab-logout" type="button">Выйти</button>' +
      '</div>' +
      '<nav class="cab-nav" aria-label="Разделы кабинета">' +
      '  <button class="cab-nav-link" data-view="home" type="button">Главная</button>' +
      '  <button class="cab-nav-link" data-view="tasks" type="button">Задачи</button>' +
      '  <button class="cab-nav-link" data-view="sub" type="button">Подписка</button>' +
      '  <button class="cab-nav-link" data-view="profile" type="button">Мои данные</button>' +
      '</nav>' +
      '<div class="cab-view"></div>';

    app.appendChild(wrap);
    revealIn(wrap);

    wrap.querySelector(".cab-logout").addEventListener("click", doLogout);

    var navLinks = wrap.querySelectorAll(".cab-nav-link");
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        view = link.getAttribute("data-view");
        renderView();
      });
    });

    renderView();
  }

  function renderView() {
    var viewBox = app.querySelector(".cab-view");
    if (!viewBox) return;
    viewBox.innerHTML = "";

    var links = app.querySelectorAll(".cab-nav-link");
    links.forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("data-view") === view);
    });

    var node;
    if (view === "tasks") node = renderTasksView();
    else if (view === "sub") node = renderSubView();
    else if (view === "profile") node = renderProfileView();
    else node = renderHomeView();

    if (node) viewBox.appendChild(node);
  }

  /* --- Главная --- */

  function renderHomeView() {
    var name = (profile && (profile.display_name || profile.username)) || "клиент";
    var box = el("div", "cab-home");

    var welcome = el("div", "cab-card cab-welcome");
    welcome.innerHTML =
      '<p class="eyebrow">// кабинет</p>' +
      '<h3 class="cab-welcome-title">Добрый день, ' + esc(name) + '!</h3>' +
      '<p class="cab-sec-body">Здесь статус вашего проекта, задачи и подписка — всё в одном месте.</p>';
    box.appendChild(welcome);

    if (profile && profile.project_status) {
      var status = el("div", "cab-card");
      status.innerHTML =
        '<p class="eyebrow">// статус проекта</p>' +
        '<p class="cab-value">' + esc(profile.project_status) + '</p>';
      box.appendChild(status);
    }

    /* Плитки-ссылки на разделы */
    var tiles = el("div", "cab-tiles");

    var taskCount = tasks.length;
    var subLabel = (subscription && subscription.status === "active") ? "активна" : "не оформлена";

    tiles.appendChild(makeTile("tasks", "Задачи", taskCount ? taskCount + " задач(и)" : "пока пусто"));
    tiles.appendChild(makeTile("sub", "Подписка", subLabel));
    tiles.appendChild(makeTile("profile", "Мои данные", (profile && (profile.site_url || profile.contact)) ? "контакты и сайт" : "профиль"));
    box.appendChild(tiles);

    /* Новости */
    if (news.length) {
      var newsBox = el("div", "cab-card");
      newsBox.appendChild(el("p", "eyebrow", "// новости"));
      news.forEach(function (n) {
        var item = el("div", "cab-news-item");
        item.innerHTML =
          '<div class="cab-news-title">' + esc(n.title) + '</div>' +
          '<div class="cab-news-body">' + esc(n.body) + '</div>' +
          '<div class="cab-news-date">' + esc(fmtDate(n.created_at)) + '</div>';
        newsBox.appendChild(item);
      });
      box.appendChild(newsBox);
    }

    return box;
  }

  function makeTile(target, title, note) {
    var tile = el("button", "cab-tile", null);
    tile.type = "button";
    tile.setAttribute("data-view", target);
    tile.innerHTML =
      '<span class="cab-tile-title">' + esc(title) + '</span>' +
      '<span class="cab-tile-note">' + esc(note) + '</span>' +
      '<span class="cab-tile-arrow" aria-hidden="true">\u2192</span>';
    tile.addEventListener("click", function () {
      view = target;
      renderView();
    });
    return tile;
  }

  /* --- Задачи --- */

  function renderTasksView() {
    var box = el("div", "cab-card");
    box.innerHTML = '<p class="eyebrow">// задачи</p>';

    if (!tasks.length) {
      box.appendChild(el("p", "cab-muted", "// Задач пока нет — всё идёт по плану."));
      return box;
    }

    var list = el("div", "cab-tasks");
    tasks.forEach(function (t) {
      var st = statusOf(t.status);
      var item = el("div", "cab-task");
      item.innerHTML =
        '<span class="cab-task-glyph" aria-hidden="true">' + esc(st.glyph) + '</span>' +
        '<span class="cab-task-title">' + esc(t.title) + '</span>' +
        '<span class="cab-task-status">' + esc(st.label) + '</span>';
      list.appendChild(item);
    });
    box.appendChild(list);
    return box;
  }

  /* --- Подписка --- */

  function renderSubView() {
    var box = el("div", "cab-card");
    box.innerHTML = '<p class="eyebrow">// подписка</p>';

    var active = subscription && subscription.status === "active";

    if (active) {
      var info = el("div", "cab-sub-info");
      info.innerHTML =
        '<span class="cab-sub-pill is-active">активна</span>' +
        '<p class="cab-sub-plan">' + esc(subscription.plan || "Подписка") + '</p>';

      var rows = el("div", "cab-profile-rows");
      if (subscription.started_at) {
        rows.appendChild(profileRow("Период", fmtDate(subscription.started_at) + " — " + (subscription.expires_at ? fmtDate(subscription.expires_at) : "без срока")));
      }
      if (subscription.price != null) {
        rows.appendChild(profileRow("Стоимость", fmtMoney(subscription.price) + " / мес"));
      }
      box.appendChild(info);
      box.appendChild(rows);

      var foot = el("p", "cab-muted", "// Изменения подписки — по договорённости с AM.DEV.");
      foot.style.marginTop = "1rem";
      box.appendChild(foot);
    } else {
      box.appendChild(el("p", "cab-value", "Подписка не оформлена."));
      box.appendChild(el("p", "cab-muted", "// Оформите подписку — и мы продолжим развивать и поддерживать ваш проект."));

      var actions = el("div", "cab-actions");
      var btn = el("a", "btn btn-primary", null);
      btn.href = SUPPORT_TG;
      btn.target = "_blank";
      btn.rel = "noopener";
      btn.innerHTML = 'Оформить подписку <span aria-hidden="true">\u2192</span>';
      actions.appendChild(btn);
      box.appendChild(actions);
    }

    return box;
  }

  /* --- Мои данные --- */

  function renderProfileView() {
    var box = el("div", "cab-card");
    box.innerHTML = '<p class="eyebrow">// мои данные</p>';

    var rows = el("div", "cab-profile-rows");

    if (profile) {
      if (profile.display_name) rows.appendChild(profileRow("Имя", profile.display_name));
      if (profile.site_url) {
        var link = el("a", "cab-site-link", "→ " + esc(profile.site_url));
        link.href = /^https?:\/\//i.test(profile.site_url) ? profile.site_url : "https://" + profile.site_url;
        link.target = "_blank";
        link.rel = "noopener";
        rows.appendChild(profileRowNode("Сайт", link));
      }
      if (profile.contact) rows.appendChild(profileRow("Контакт", profile.contact));
      if (clientEmail) rows.appendChild(profileRow("Email", clientEmail));
      if (profile.username) rows.appendChild(profileRow("Логин", profile.username));
      if (profile.created_at) rows.appendChild(profileRow("В системе с", fmtDate(profile.created_at)));
    }

    box.appendChild(rows);
    return box;
  }

  function profileRow(label, value) {
    return profileRowNode(label, el("span", "cab-value", esc(value)));
  }

  function profileRowNode(label, node) {
    var row = el("div", "cab-profile-row");
    row.appendChild(el("span", "cab-profile-label", esc(label)));
    row.appendChild(node);
    return row;
  }

  /* ---------- Инициация ---------- */

  function init() {
    if (!configured) {
      renderNotConfigured();
      return;
    }
    renderLoading("// подключаюсь…");
    supabase.auth.getSession()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.session) {
          loadCabinet();
        } else {
          renderLogin();
        }
      })
      .catch(function (err) {
        console.error("cabinet: session failed", err);
        renderError("// Не удалось подключиться к кабинету.");
      });
  }

  init();
})();
