/* ============================================================
   AM.DEV — main.js
   Меню · Reveal · Курсор · Форма · Год · Активная навигация
   ============================================================ */
(function () {
  "use strict";

  /* Помечаем, что JS активен (для гейтинга reveal-анимаций) */
  document.documentElement.classList.add("js");

  /* ---------- Активный пункт меню ---------- */
  var page = document.body.dataset.page;
  if (page) {
    var link = document.querySelector('.nav a[data-page="' + page + '"]');
    if (link) link.classList.add("active");
    var mLink = document.querySelector('.mobile-menu nav a[data-page="' + page + '"]');
    if (mLink) mLink.classList.add("active");
  }

  /* ---------- Тема: день/ночь ---------- */
  var themeKey = "amdev-theme";
  var themeBtn = document.getElementById("themeToggle");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeBtn) themeBtn.setAttribute("aria-pressed", theme === "light");
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(themeKey); } catch (e) {}
    applyTheme(saved === "light" ? "light" : "dark");
  })();

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(themeKey, next); } catch (e) {}
    });
  }

  /* ---------- Мобильное меню ---------- */
  var burger = document.getElementById("burger");
  var mobileMenu = document.getElementById("mobileMenu");

  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("open");
    if (burger) burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (burger && mobileMenu) {
    burger.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(isOpen));
      mobileMenu.setAttribute("aria-hidden", String(!isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    /* Закрытие по клику на ссылку */
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    /* Закрытие по Esc */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Reveal при скролле ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Кастомный курсор (только мышь + десктоп) ---------- */
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer) {
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.appendChild(dot);
    document.documentElement.classList.add("has-cursor");

    /* Позиция и масштаб сглаживаются в одном rAF-цикле */
    var x = 0, y = 0, px = 0, py = 0;
    var scale = 1, scaleTarget = 1;
    var raf = null;

    function loop() {
      px += (x - px) * 0.18;
      py += (y - py) * 0.18;
      scale += (scaleTarget - scale) * 0.2;
      dot.style.transform =
        "translate3d(" + px + "px," + py + "px,0) scale(" + scale.toFixed(3) + ")";
      raf = null;
    }
    function tick() {
      if (!raf) raf = requestAnimationFrame(loop);
    }

    document.addEventListener("mousemove", function (e) {
      x = e.clientX;
      y = e.clientY;
      tick();
    });
    /* Масштаб над интерактивными элементами */
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest("a, button, .card, .contact-row, input, textarea, label")) {
        scaleTarget = 2.6;
        tick();
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest("a, button, .card, .contact-row, input, textarea, label")) {
        scaleTarget = 1;
        tick();
      }
    });
    document.addEventListener("mousedown", function () {
      scaleTarget = 0.7;
      tick();
    });
    document.addEventListener("mouseup", function () {
      scaleTarget = 1;
      tick();
    });
  }

  /* ---------- Форма (отправка через FormSubmit AJAX) ---------- */
  var form = document.getElementById("contactForm");
  if (form) {
    var success = document.getElementById("formSuccess");
    var errorBox = document.getElementById("formError");
    var submitBtn = form.querySelector('[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.textContent : "";

    /* Адрес доставки собирается по частям, чтобы не лежать в коде открытым текстом */
    var deliveryEmail = "atarogamesgames" + "@" + "gmail.com";
    var endpoint = "https://formsubmit.co/ajax/" + deliveryEmail;

    function fieldValue(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправка…";
      }
      if (errorBox) errorBox.classList.remove("show");

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: "Новая заявка с сайта AM.DEV",
          _template: "table",
          _captcha: "false",
          _honey: fieldValue("_honey"),
          name: fieldValue("name"),
          contact: fieldValue("contact"),
          message: fieldValue("message")
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json && json.success === "true") {
            form.style.display = "none";
            if (success) success.classList.add("show");
            if (success) success.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            throw new Error((json && json.message) || "send failed");
          }
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
          }
          if (errorBox) {
            errorBox.classList.add("show");
            errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
    });
  }

  /* ---------- Год в подвале ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Хедер: уплотнение при скролле (тонкий штрих) ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            header.style.borderBottomColor =
              window.scrollY > 8 ? "var(--line-2)" : "var(--line)";
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------- Cookie-баннер ---------- */
  var cookieBanner = document.getElementById("cookieBanner");
  var consentKey = "amdev-cookie-consent";

  function showCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.classList.add("show");
    cookieBanner.setAttribute("aria-hidden", "false");
  }
  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.classList.remove("show");
    cookieBanner.setAttribute("aria-hidden", "true");
  }

  if (cookieBanner) {
    var consent = null;
    try { consent = localStorage.getItem(consentKey); } catch (e) { consent = null; }

    /* Показываем с небольшой задержкой, только если выбора ещё не было */
    if (!consent) setTimeout(showCookieBanner, 1200);

    function setConsent(value) {
      try { localStorage.setItem(consentKey, value); } catch (e) {}
      hideCookieBanner();
    }

    var acceptBtn = document.getElementById("cookieAccept");
    var declineBtn = document.getElementById("cookieDecline");
    if (acceptBtn) acceptBtn.addEventListener("click", function () { setConsent("accepted"); });
    if (declineBtn) declineBtn.addEventListener("click", function () { setConsent("declined"); });
  }

  /* Повторный показ баннера по ссылке «Cookie» в футере */
  var cookieSettings = document.getElementById("cookieSettings");
  if (cookieSettings) {
    cookieSettings.addEventListener("click", function (e) {
      e.preventDefault();
      showCookieBanner();
    });
  }
})();
