/* ============================================================
   AM.DEV — owner/online.js
   Панель владельца: кто онлайн сейчас + история посещений.
   Требует роль 'owner' у пользователя (см. supabase/OWNER_GUIDE.md).
   Vanilla JS · IIFE · без зависимостей (кроме supabase.global.js)
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.AM_CABINET || {};
  var SUPABASE_URL = CFG.SUPABASE_URL || "";
  var SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "";

  var app = document.getElementById("ownerApp");
  if (!app) return;

  if (!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)) {
    renderFatal("Панель не настроена: впишите ключи Supabase в js/cabinet-config.js.");
    return;
  }

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  var refreshTimer = null;
  var ONLINE_WINDOW_MS = 2 * 60 * 1000; // «онлайн» = активность свежее 2 минут
  var REFRESH_MS = 15000;               // автообновление списков

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

  // Роль из JWT (claim 'role': 'authenticated' по умолчанию, 'owner' — у владельца)
  function jwtRole(token) {
    if (!token) return "";
    try {
      var part = token.split(".")[1];
      var json = part.replace(/-/g, "+").replace(/_/g, "/");
      while (json.length % 4) json += "=";
      return (JSON.parse(atob(json)).role) || "";
    } catch (e) {
      return "";
    }
  }

  function fmtDT(d) {
    if (!d) return "";
    var date = new Date(d);
    if (isNaN(date)) return String(d);
    return date.toLocaleString("ru-RU", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  function fmtAgo(d) {
    if (!d) return "";
    var date = new Date(d);
    if (isNaN(date)) return String(d);
    var diff = Date.now() - date.getTime();
    if (diff < 60000) return "только что";
    if (diff < 3600000) return Math.round(diff / 60000) + " мин назад";
    if (diff < 86400000) return Math.round(diff / 3600000) + " ч назад";
    return Math.round(diff / 86400000) + " дн назад";
  }

  function isOnline(profile) {
    if (!profile || !profile.last_seen_at) return false;
    return Date.now() - new Date(profile.last_seen_at).getTime() < ONLINE_WINDOW_MS;
  }

  /* ---------- Рендер ---------- */

  function renderFatal(msg) {
    app.innerHTML = "";
    var box = el("div", "cab-login cab-login--fatal reveal");
    box.innerHTML =
      '<p class="cab-login-eyebrow">// ошибка</p>' +
      '<h2 class="cab-login-title">Панель недоступна</h2>' +
      '<p class="cab-err show">' + esc(msg) + '</p>';
    app.appendChild(box);
  }

  function renderLoading(text) {
    app.innerHTML = "";
    var box = el("div", "cab-loading reveal");
    box.innerHTML = '<span class="cab-loading-text">' + esc(text || "// загрузка…") + '</span><span class="cab-caret" aria-hidden="true"></span>';
    app.appendChild(box);
  }

  function renderLogin(errMsg) {
    stopRefresh();
    app.innerHTML = "";
    var wrap = el("div", "owner-login-wrap");
    var card = el("div", "cab-login reveal");
    card.innerHTML =
      '<p class="cab-login-eyebrow">// онлайн-панель владельца</p>' +
      '<h2 class="cab-login-title">Вход</h2>' +
      '<form class="cab-login-form" autocomplete="on">' +
      '  <div class="cab-field">' +
      '    <label for="ownerLogin">Email</label>' +
      '    <input class="cab-input" id="ownerLogin" name="login" type="email" autocomplete="username" placeholder="you@example.ru" spellcheck="false" required>' +
      '  </div>' +
      '  <div class="cab-field" style="margin-top:1.1rem">' +
      '    <label for="ownerPass">Пароль</label>' +
      '    <input class="cab-input" id="ownerPass" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required>' +
      '  </div>' +
      '  <p class="cab-err" role="status" aria-live="polite"></p>' +
      '  <button class="btn btn-primary cab-submit" type="submit"><span class="cab-btn-label">// Войти</span> <span aria-hidden="true">\u2192</span></button>' +
      '</form>' +
      '<p class="cab-hint" style="margin-top:1rem">Страница работает только у владельца (роль owner). ' +
      'Как настроить — см. supabase/OWNER_GUIDE.md, Шаг 9.</p>';
    wrap.appendChild(card);
    app.appendChild(wrap);

    var form = card.querySelector("form");
    var login = card.querySelector("#ownerLogin");
    var pass = card.querySelector("#ownerPass");
    var errEl = card.querySelector(".cab-err");
    var btn = card.querySelector(".cab-submit");
    var label = card.querySelector(".cab-btn-label");

    if (errMsg) { errEl.textContent = errMsg; errEl.classList.add("show"); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      if (!login.value.trim() || !pass.value) {
        errEl.textContent = "// Введите email и пароль";
        errEl.classList.add("show");
        return;
      }
      errEl.textContent = "";
      errEl.classList.remove("show");
      btn.disabled = true;
      label.textContent = "// проверяю…";
      supabase.auth.signInWithPassword({ email: login.value.trim().toLowerCase(), password: pass.value })
        .then(function (res) {
          if (res.error) throw res.error;
          afterLogin();
        })
        .catch(function () {
          btn.disabled = false;
          label.textContent = "// Войти";
          errEl.textContent = "// Неверный email или пароль";
          errEl.classList.add("show");
        });
    });

    if (login.value) pass.focus(); else login.focus();
  }

  function renderNoAccess(email) {
    stopRefresh();
    app.innerHTML = "";
    var box = el("div", "cab-login cab-login--fatal reveal");
    box.innerHTML =
      '<p class="cab-login-eyebrow">// доступ ограничен</p>' +
      '<h2 class="cab-login-title">Только для владельца</h2>' +
      '<p class="cab-sec-body">Аккаунт <b>' + esc(email) + '</b> не имеет роли владельца. ' +
      'Назначьте роль: <code>update auth.users set role = &apos;owner&apos; where id = &apos;&lt;id&gt;&apos;;</code> — ' +
      'затем выйдите и войдите снова (см. supabase/OWNER_GUIDE.md, Шаг 9).</p>' +
      '<button class="btn btn-ghost" type="button" style="margin-top:1.25rem">Выйти</button>';
    box.querySelector("button").addEventListener("click", doLogout);
    app.appendChild(box);
  }

  function afterLogin() {
    var sess = null;
    supabase.auth.getSession()
      .then(function (r) {
        if (r.error) throw r.error;
        sess = r.data.session;
        if (!sess) { renderLogin(); return null; }
        if (jwtRole(sess.access_token) !== "owner") {
          renderNoAccess(sess.user.email);
          return null;
        }
        renderDash();
      })
      .catch(function (err) { console.error("online: session failed", err); renderLogin(); });
  }

  function renderDash() {
    app.innerHTML = "";
    var wrap = el("div", "owner-dash reveal");

    wrap.innerHTML =
      '<div class="owner-card" style="border:none;background:none;padding:0">' +
      '  <p class="eyebrow" data-num="ONLINE">Онлайн-панель</p>' +
      '  <h1 class="owner-title">Кто на сайте <span class="t-dim">сейчас</span></h1>' +
      '  <p class="owner-sub">Клиент считается онлайн, пока открыт его кабинет (активность свежее 2 минут). ' +
      '  Обновление каждые 15 секунд.</p>' +
      '</div>' +
      '<div class="owner-grid">' +
      '  <section class="owner-card" id="owOnlineCard">' +
      '    <p class="eyebrow">// онлайн сейчас</p>' +
      '    <div id="owOnlineList" class="owner-list"><span class="cab-loading-text">// загрузка…</span></div>' +
      '  </section>' +
      '  <section class="owner-card" id="owHistoryCard">' +
      '    <p class="eyebrow">// история посещений</p>' +
      '    <div id="owHistoryList"><span class="cab-loading-text">// загрузка…</span></div>' +
      '  </section>' +
      '</div>' +
      '<p class="owner-foot-note" id="owUpdated"></p>' +
      '<div class="owner-top" style="border:none;padding:1.5rem 0 0">' +
      '  <button class="btn btn-ghost" id="owLogout" type="button">Выйти</button>' +
      '</div>';

    app.appendChild(wrap);

    wrap.querySelector("#owLogout").addEventListener("click", doLogout);
    loadData();
    startRefresh();
  }

  function loadData() {
    var now = new Date().toISOString();
    var p = supabase.from("profiles")
      .select("id, username, display_name, last_seen_at")
      .order("username");

    var v = supabase.from("visits")
      .select("visited_at, profiles (username, display_name)")
      .order("visited_at", { ascending: false })
      .limit(50);

    Promise.all([p, v])
      .then(function (res) {
        if (res[0].error) throw res[0].error;
        if (res[1].error) throw res[1].error;
        renderOnline(res[0].data || []);
        renderHistory(res[1].data || []);
        var upd = app.querySelector("#owUpdated");
        if (upd) upd.textContent = "// обновлено " + fmtDT(now);
      })
      .catch(function (err) {
        console.error("online: load failed", err);
        var list = app.querySelector("#owOnlineList");
        if (list) list.innerHTML = '<p class="owner-empty">// Не удалось загрузить данные.</p>';
      });
  }

  function renderOnline(profiles) {
    var list = app.querySelector("#owOnlineList");
    if (!list) return;
    list.innerHTML = "";

    var online = profiles.filter(isOnline);
    var counter = el("p", "owner-empty");
    counter.textContent = online.length
      ? "// в сети: " + online.length + " из " + profiles.length
      : "// никого нет в сети (" + (profiles.length ? "клиентов: " + profiles.length : "клиентов пока нет") + ")";
    list.appendChild(counter);

    if (!profiles.length) return;

    profiles.forEach(function (pr) {
      var name = pr.display_name || pr.username || "—";
      var row = el("div", "owner-row");
      var dot = el("span", "owner-dot" + (isOnline(pr) ? " is-online" : ""), null);
      row.appendChild(dot);
      row.appendChild(el("span", "owner-name", esc(name)));
      row.appendChild(el("span", "owner-meta", isOnline(pr)
        ? "в сети · " + fmtAgo(pr.last_seen_at)
        : "не в сети · " + (pr.last_seen_at ? fmtAgo(pr.last_seen_at) : "не заходил")));
      list.appendChild(row);
    });
  }

  function renderHistory(visits) {
    var box = app.querySelector("#owHistoryList");
    if (!box) return;
    box.innerHTML = "";

    if (!visits.length) {
      box.appendChild(el("p", "owner-empty", "// Пока нет посещений — клиент ещё не заходил в кабинет."));
      return;
    }

    var table = el("table", "owner-table");
    table.innerHTML =
      '<thead><tr><th>Когда</th><th>Клиент</th></tr></thead>';
    var tbody = el("tbody");
    visits.forEach(function (v) {
      var name = (v.profiles && (v.profiles.display_name || v.profiles.username)) || "—";
      var tr = el("tr");
      tr.appendChild(el("td", null, esc(fmtDT(v.visited_at))));
      tr.appendChild(el("td", null, esc(name)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    box.appendChild(table);
  }

  function startRefresh() {
    stopRefresh();
    refreshTimer = setInterval(loadData, REFRESH_MS);
  }

  function stopRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  function doLogout() {
    stopRefresh();
    supabase.auth.signOut()
      .catch(function (err) { console.error("online: signOut failed", err); })
      .then(function () { renderLogin(); });
  }

  /* ---------- Инициация ---------- */

  function init() {
    renderLoading("// подключаюсь…");
    supabase.auth.getSession()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.session) {
          if (jwtRole(r.data.session.access_token) !== "owner") {
            renderNoAccess(r.data.session.user.email);
          } else {
            renderDash();
          }
        } else {
          renderLogin();
        }
      })
      .catch(function (err) {
        console.error("online: init failed", err);
        renderLogin();
      });
  }

  init();
})();
