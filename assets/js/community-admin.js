// The Community review page (/community-admin). Everything shown is put on the page as plain text - posts are written by members - so nothing here
// is ever treated as HTML. The admin key lives only in this tab's sessionStorage and is sent only to the Miki server.
(function () {
  "use strict";
  var API = (window.MIKI && window.MIKI.apiBase) || "";
  if (!document.getElementById("cm-admin")) return;

  var $ = function (id) { return document.getElementById(id); };
  var form = $("cm-form");
  var keyInput = $("cm-key");
  var status = $("cm-status");
  var REASONS = { spam: "Spam", offensive: "Offensive", promo: "Self-promotion", other: "Other" };
  var TEMPLATES = [
    ["", "Write your own message..."],
    ["Please don't advertise or promote your own things in Community. Keep posts about anime.", "Advertising / self-promotion"],
    ["Please keep your wording friendly. Offensive language isn't allowed in Community.", "Offensive wording"],
    ["That post wasn't about anime or manga. Please keep Community on topic.", "Off topic"],
    ["The same post was sent several times. Please post it once and join the conversation there.", "Repeated posts"]
  ];
  var HOURS = [[1, "1 hour"], [24, "1 day"], [72, "3 days"], [168, "7 days"], [720, "30 days"], [0, "Until I lift it"]];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function when(iso) { return iso ? String(iso).slice(0, 16).replace("T", " ") + " UTC" : ""; }
  function say(text, bad) { status.textContent = text || ""; status.className = "rep-status" + (bad ? " bad" : ""); }
  function clear(node) { node.textContent = ""; }

  function request(method, path, body) {
    var headers = { Authorization: "Bearer " + keyInput.value.trim() };
    if (body) headers["Content-Type"] = "application/json";
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function failText(res) {
    if (res.status === 401) return "That key isn't right.";
    if (res.status === 429) return "Too many wrong attempts. Wait a few minutes and try again.";
    if (res.status === 503) return "Review isn't switched on yet (REPORTS_ADMIN_KEY is not set).";
    return "Something went wrong (error " + res.status + ").";
  }

  function stat(label, value) {
    var d = el("div", "rep-stat");
    d.appendChild(el("strong", "", String(value)));
    d.appendChild(el("span", "", label));
    return d;
  }
  function button(text, cls, onClick) {
    var b = el("button", "btn btn-sm " + cls, text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // ---- doing something -------------------------------------------------------------------------------------------------
  function act(body, done) {
    say("Working...");
    request("POST", "/reports/admin/community/action", body).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (j) { say(j.error || failText(res), true); }, function () { say(failText(res), true); });
      }
      say(done || "Done.");
      return load(true);
    }, function () { say("Couldn't reach the server. Check your connection and try again.", true); });
  }

  // The inline form for a warning or a pause: what the person will read, and (for a pause) for how long.
  function decisionPanel(item, mode, onClose) {
    var panel = el("div", "cm-panel");
    var pick = el("select", "cm-input");
    TEMPLATES.forEach(function (t) { var o = el("option", "", t[1]); o.value = t[0]; pick.appendChild(o); });
    var text = el("textarea", "cm-input");
    text.rows = 3;
    text.maxLength = 500;
    text.placeholder = "What the person will read in the app - short and kind.";
    pick.addEventListener("change", function () { if (pick.value) text.value = pick.value; });
    panel.appendChild(pick);
    panel.appendChild(text);

    var hours = null;
    if (mode === "mute") {
      hours = el("select", "cm-input");
      HOURS.forEach(function (h) { var o = el("option", "", h[1]); o.value = String(h[0]); if (h[0] === 24) o.selected = true; hours.appendChild(o); });
      var label = el("label", "cm-inline", "Pause for ");
      label.appendChild(hours);
      panel.appendChild(label);
    }
    var alsoDelete = el("input");
    alsoDelete.type = "checkbox";
    alsoDelete.checked = true;
    var del = el("label", "cm-inline");
    del.appendChild(alsoDelete);
    del.appendChild(document.createTextNode(" Also delete this " + item.type));
    panel.appendChild(del);

    var row = el("div", "cm-actions");
    row.appendChild(button(mode === "warn" ? "Send warning" : "Pause posting", "btn-primary", function () {
      var message = text.value.trim();
      if (message.length < 3) { say("Write the message the person will see first.", true); return; }
      var body = { type: item.type, id: item.id, action: mode, message: message, alsoDelete: alsoDelete.checked };
      if (hours) body.hours = Number(hours.value);
      act(body, mode === "warn" ? "Warning sent." : "Posting paused.");
    }));
    row.appendChild(button("Cancel", "btn-ghost", onClose));
    panel.appendChild(row);
    return panel;
  }

  // ---- the queue -------------------------------------------------------------------------------------------------------
  function badge(text, cls) { return el("span", "cm-badge" + (cls ? " " + cls : ""), text); }

  function itemCard(item) {
    var card = el("section", "rep-clip cm-card");
    var head = el("div", "cm-badges");
    head.appendChild(badge(item.type === "post" ? "Post (" + item.kind + ")" : "Comment"));
    if (item.hidden) head.appendChild(badge("Hidden from members", "cm-warn"));
    head.appendChild(badge(item.reports + (item.reports === 1 ? " report" : " reports"), "cm-hot"));
    Object.keys(item.reasons).forEach(function (r) { head.appendChild(badge((REASONS[r] || r) + " x" + item.reasons[r])); });
    card.appendChild(head);

    if (item.title) card.appendChild(el("h3", "", item.title));
    var bits = [item.authorName + (item.isTeam ? " (team)" : ""), "written " + when(item.createdAt), "last reported " + when(item.lastReportAt)];
    if (item.authorWarnings) bits.push(item.authorWarnings + (item.authorWarnings === 1 ? " earlier warning" : " earlier warnings"));
    if (item.authorMuted) bits.push("currently paused");
    card.appendChild(el("p", "rep-clip-meta", bits.join("  ·  ")));
    card.appendChild(el("div", "cm-text", item.text));

    var actions = el("div", "cm-actions");
    var slot = el("div");
    function close() { clear(slot); actions.hidden = false; }
    function open(mode) { actions.hidden = true; clear(slot); slot.appendChild(decisionPanel(item, mode, close)); }
    actions.appendChild(button("Keep", "btn-ghost", function () { act({ type: item.type, id: item.id, action: "keep" }, "Kept."); }));
    actions.appendChild(button("Warn...", "btn-ghost", function () { open("warn"); }));
    actions.appendChild(button("Pause posting...", "btn-ghost", function () { open("mute"); }));
    actions.appendChild(button("Delete", "btn-danger", function () {
      if (window.confirm("Delete this " + item.type + " for good?")) act({ type: item.type, id: item.id, action: "delete" }, "Deleted.");
    }));
    card.appendChild(actions);
    card.appendChild(slot);
    return card;
  }

  function renderQueue(items) {
    var box = $("cm-queue");
    clear(box);
    $("cm-queue-h").hidden = false;
    if (!items.length) { box.appendChild(el("p", "rep-clip-meta", "Nothing is waiting. Reported posts and comments will show up here.")); return; }
    items.forEach(function (item) { box.appendChild(itemCard(item)); });
  }

  function renderMuted(list) {
    var box = $("cm-muted");
    clear(box);
    $("cm-muted-h").hidden = !list.length;
    list.forEach(function (m) {
      var row = el("section", "rep-clip cm-card");
      row.appendChild(el("h3", "", m.authorName));
      row.appendChild(el("p", "rep-clip-meta", (m.until ? "until " + when(m.until) : "until you lift it") + "  ·  since " + when(m.since)));
      row.appendChild(el("div", "cm-text", m.message));
      var actions = el("div", "cm-actions");
      actions.appendChild(button("Lift the pause", "btn-ghost", function () { act({ action: "unmute", authorKey: m.authorKey }, "Posting is allowed again."); }));
      row.appendChild(actions);
      box.appendChild(row);
    });
  }

  function renderTerms(terms) {
    var box = $("cm-terms");
    clear(box);
    ["cm-terms-h", "cm-terms-note", "cm-term-form"].forEach(function (id) { $(id).hidden = false; });
    terms.forEach(function (t) {
      var chip = el("span", "cm-badge");
      chip.appendChild(document.createTextNode(t + " "));
      var x = el("button", "cm-x", "x");
      x.type = "button";
      x.title = "Allow this word again";
      x.addEventListener("click", function () {
        request("POST", "/reports/admin/community/blocked-terms/remove", { term: t }).then(function (res) { return res.ok ? res.json().then(function (j) { renderTerms(j.blockedTerms); }) : say(failText(res), true); });
      });
      chip.appendChild(x);
      box.appendChild(chip);
    });
    if (!terms.length) box.appendChild(el("p", "rep-clip-meta", "No words blocked yet."));
  }

  function render(data) {
    var summary = $("cm-summary");
    clear(summary);
    summary.hidden = false;
    summary.appendChild(stat("waiting for a decision", data.queue.length));
    summary.appendChild(stat("hidden by reports", data.queue.filter(function (i) { return i.hidden; }).length));
    summary.appendChild(stat("paused from posting", data.muted.length));
    renderQueue(data.queue);
    renderMuted(data.muted);
    renderTerms(data.blockedTerms);
    $("cm-refresh").hidden = false;
  }

  function load(quiet) {
    if (!quiet) say("Loading...");
    return request("GET", "/reports/admin/community").then(function (res) {
      if (!res.ok) { say(failText(res), true); return; }
      return res.json().then(function (data) {
        render(data);
        if (!quiet || status.textContent === "Working...") say("Updated " + when(data.generatedAt) + ".");
      });
    }, function () { say("Couldn't reach the server. Check your connection and try again.", true); });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    try { sessionStorage.setItem("miki_report_key", keyInput.value.trim()); } catch (x) { /* private mode: fine */ }
    load(false);
  });
  $("cm-refresh").addEventListener("click", function () { load(false); });
  $("cm-term-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var term = $("cm-term").value.trim();
    if (!term) return;
    request("POST", "/reports/admin/community/blocked-terms", { term: term }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (j) { say(j.error || failText(res), true); }, function () { say(failText(res), true); });
      }
      $("cm-term").value = "";
      return res.json().then(function (j) { renderTerms(j.blockedTerms); say("Blocked."); });
    }, function () { say("Couldn't reach the server.", true); });
  });
  try { var saved = sessionStorage.getItem("miki_report_key"); if (saved) keyInput.value = saved; } catch (x) { /* nothing saved */ }
})();
