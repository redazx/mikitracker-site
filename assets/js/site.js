(function () {
  "use strict";

  // ---- Store buttons: "Coming soon" until config.js has the Google Play link
  var url = (window.MIKI && window.MIKI.playStoreUrl) || "";
  document.querySelectorAll("[data-store]").forEach(function (el) {
    if (!url) return;
    el.setAttribute("href", url);
    el.removeAttribute("aria-disabled");
    el.removeAttribute("tabindex");
    el.setAttribute("rel", "noopener");
    el.querySelectorAll(".soon").forEach(function (s) { s.remove(); });
    var small = el.querySelector("small");
    var strong = el.querySelector("strong");
    if (small) small.textContent = "Get it on";
    if (strong) strong.textContent = "Google Play";
    if (el.classList.contains("btn")) el.textContent = "Get it on Google Play";
  });
  document.querySelectorAll("[data-store-note]").forEach(function (el) { if (url) el.hidden = true; });

  // ---- Reveal sections as they scroll into view
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Accent picker (home page): the same 18 colors as the app's Appearance screen
  var picker = document.getElementById("picker");
  if (picker) {
    var colors = [
      ["Classic", "#FFFFFF"], ["Blue", "#2196F3"], ["Red", "#EF5350"], ["Green", "#4CAF50"], ["Orange", "#FF9800"],
      ["Yellow", "#FFC94D"], ["Pink", "#EC407A"], ["Purple", "#AB47BC"], ["Teal", "#26A69A"], ["Cyan", "#26C6DA"],
      ["Royal Blue", "#3F7BE0"], ["Indigo", "#5568D8"],
      ["Deep Purple", "#8E4DE0"], ["Emerald", "#2E9E5B"], ["Crimson", "#D23C4C"], ["Wine", "#B83A6B"], ["Bronze", "#B07A52"], ["Slate", "#7C93A8"],
    ];
    var current = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().toLowerCase();
    if (current === "#fff") current = "#ffffff";
    var root = document.documentElement;
    var tickFor = function (hex) {
      var n = parseInt(hex.slice(1), 16), lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
      var stroke = lum > 0.5 ? "%230c0c0f" : "%23ffffff";
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='" + stroke + "' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E\")";
    };
    colors.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.style.setProperty("--c", c[1]);
      b.style.setProperty("--tick", tickFor(c[1]));
      b.setAttribute("aria-label", c[0]);
      b.title = c[0];
      b.setAttribute("aria-pressed", String(c[1].toLowerCase() === current));
      b.addEventListener("click", function () {
        var n = parseInt(c[1].slice(1), 16), lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
        root.style.setProperty("--accent", c[1]);
        root.style.setProperty("--accent-ink", lum > 0.5 ? "#0c0c0f" : "#ffffff");
        root.style.setProperty("--glow-pct", c[1].toLowerCase() === "#ffffff" ? "14%" : "34%");
        picker.querySelectorAll(".swatch").forEach(function (s) { s.setAttribute("aria-pressed", String(s === b)); });
        try { localStorage.setItem("miki-accent", c[1]); } catch (e) { /* ignore */ }
      });
      picker.appendChild(b);
    });
  }

  // ---- Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
