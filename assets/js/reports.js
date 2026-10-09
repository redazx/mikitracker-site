// The Sponsored report pages (/sponsor-admin and /sponsor-report). Everything shown is put on the page as plain text - titles come from YouTube, so nothing
// here is ever treated as HTML. The admin key lives only in this tab's sessionStorage; a sponsor's page uses the private link it was opened with.
(function () {
  "use strict";
  var API = (window.MIKI && window.MIKI.apiBase) || "";
  var isAdmin = !!document.getElementById("rep-admin");
  var isSponsor = !!document.getElementById("rep-sponsor");
  if (!isAdmin && !isSponsor) return;

  var $ = function (id) { return document.getElementById(id); };
  var status = $("rep-status");
  var clips = $("rep-clips");
  var summary = $("rep-summary");
  var form = $("rep-form");
  var csvButton = $("rep-csv");
  var params = new URLSearchParams(location.search);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function num(n) { return Number(n || 0).toLocaleString(); }
  function day(iso) { return iso ? String(iso).slice(0, 10) : ""; }
  function say(text, bad) { status.textContent = text || ""; status.className = "rep-status" + (bad ? " bad" : ""); }
  function query() {
    var q = new URLSearchParams();
    if ($("rep-from").value) q.set("from", $("rep-from").value);
    if ($("rep-to").value) q.set("to", $("rep-to").value);
    return q;
  }

  function path(csv) {
    if (isAdmin) return "/reports/admin/sponsored" + (csv ? ".csv" : "");
    return "/reports/sponsor/" + encodeURIComponent(params.get("c") || "") + (csv ? "/csv" : "");
  }
  function request(csv) {
    var q = query();
    if (isSponsor) q.set("t", params.get("t") || "");
    var headers = {};
    if (isAdmin) headers.Authorization = "Bearer " + $("rep-key").value.trim();
    return fetch(API + path(csv) + "?" + q.toString(), { headers: headers });
  }
  function fail(res) {
    if (res.status === 401) return "That key isn't right.";
    if (res.status === 404) return "This report link isn't valid.";
    if (res.status === 429) return "Too many wrong attempts. Wait a few minutes and try again.";
    if (res.status === 503) return "Reports aren't switched on yet.";
    return "Couldn't load the report (error " + res.status + ").";
  }

  function stat(label, value) {
    var d = el("div", "rep-stat");
    d.appendChild(el("strong", "", value));
    d.appendChild(el("span", "", label));
    return d;
  }

  function dayTable(days) {
    var t = el("table", "rep-table");
    var head = t.createTHead().insertRow();
    ["Day", "Impressions", "Unique viewers"].forEach(function (h) { head.appendChild(el("th", "", h)); });
    var body = t.createTBody();
    days.forEach(function (d) {
      var r = body.insertRow();
      r.insertCell().textContent = d.day;
      r.insertCell().textContent = num(d.impressions);
      r.insertCell().textContent = num(d.uniqueViewers);
    });
    return t;
  }

  function clipCard(c) {
    var card = el("section", "rep-clip");
    card.appendChild(el("h3", "", c.title || "Sponsored video"));
    var bits = [c.channel, c.note, day(c.startsAt) + " to " + day(c.endsAt)].filter(Boolean);
    card.appendChild(el("p", "rep-clip-meta", bits.join("  ·  ")));
    // The sponsor already has their totals at the top of the page; the admin sees one set per video.
    if (isAdmin) {
      var stats = el("div", "rep-stats");
      stats.appendChild(stat("impressions", num(c.impressions)));
      stats.appendChild(stat("unique viewers", num(c.uniqueViewers)));
      card.appendChild(stats);
    }
    if (isAdmin && c.reportUrl) {
      var copy = el("button", "btn btn-ghost btn-sm", "Copy the sponsor's link");
      copy.type = "button";
      copy.addEventListener("click", function () {
        navigator.clipboard.writeText(c.reportUrl).then(function () {
          copy.textContent = "Copied";
          setTimeout(function () { copy.textContent = "Copy the sponsor's link"; }, 1800);
        }, function () { window.prompt("Copy this link:", c.reportUrl); });
      });
      card.appendChild(copy);
    }
    if (c.days && c.days.length) {
      var more = el("details", "rep-days");
      more.appendChild(el("summary", "", "Day by day (" + c.days.length + ")"));
      more.appendChild(dayTable(c.days));
      card.appendChild(more);
    } else {
      card.appendChild(el("p", "rep-clip-meta", "Nothing shown yet in this period."));
    }
    return card;
  }

  function render(data) {
    var list = isAdmin ? data.clips : [data.clip];
    clips.textContent = "";
    summary.textContent = "";
    summary.hidden = false;
    if (isAdmin) {
      summary.appendChild(stat("videos booked", num(list.length)));
      summary.appendChild(stat("impressions in total", num(data.totalImpressions)));
      csvButton.hidden = false;
    } else {
      var c = list[0];
      $("rep-title").textContent = c.title || "Your Sponsored video";
      $("rep-meta").textContent = [c.channel, "runs " + day(c.startsAt) + " to " + day(c.endsAt)].filter(Boolean).join("  ·  ");
      summary.appendChild(stat("impressions", num(c.impressions)));
      summary.appendChild(stat("unique viewers", num(c.uniqueViewers)));
      form.hidden = false;
    }
    list.forEach(function (clip) { clips.appendChild(clipCard(clip)); });
    say(isAdmin && !list.length ? "No Sponsored videos have been booked yet." : "Report made " + data.generatedAt.replace("T", " ").slice(0, 16) + " UTC.");
  }

  function load() {
    say("Loading...");
    return request(false).then(function (res) {
      if (!res.ok) { say(fail(res), true); if (isSponsor) $("rep-meta").textContent = ""; return; }
      return res.json().then(render);
    }, function () { say("Couldn't reach the server. Check your connection and try again.", true); });
  }

  function download() {
    say("Preparing the file...");
    request(true).then(function (res) {
      if (!res.ok) { say(fail(res), true); return; }
      return res.blob().then(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = isAdmin ? "miki-sponsored-report.csv" : "miki-sponsored-report-" + (params.get("c") || "") + ".csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        say("Downloaded.");
      });
    }, function () { say("Couldn't reach the server.", true); });
  }

  csvButton.addEventListener("click", download);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (isAdmin) { try { sessionStorage.setItem("miki_report_key", $("rep-key").value.trim()); } catch (x) { /* private mode: fine */ } }
    load();
  });

  if (isAdmin) {
    try { var saved = sessionStorage.getItem("miki_report_key"); if (saved) $("rep-key").value = saved; } catch (x) { /* nothing saved */ }
  } else if (!params.get("c") || !params.get("t")) {
    $("rep-meta").textContent = "";
    say("This report link isn't complete. Please use the full link you were sent.", true);
  } else {
    load();
  }
})();
