// Tableau de bord admin : chiffres en direct (API GitHub) + historique quotidien (branche « stats »).
(function () {
  "use strict";
  var cfg = window.ANKOAY_CONFIG || {};
  var OWNER = cfg.githubOwner, REPO = cfg.githubRepo;
  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";
  var COL = { win: "#3D7FE6", ubu: "#D9731A", line: "#CFC5BB" };
  var fmt = function (n) { return Number(n).toLocaleString("fr-FR"); };

  // La copie de secours sur GitHub Pages n'est pas protégée : pas de tableau de bord là-bas.
  if (/github\.io$/.test(location.hostname)) {
    $("notice").hidden = false;
    $("notice").textContent = "Le tableau de bord est disponible uniquement sur le site principal (protégé) : ankoay-studio.pages.dev/admin";
    document.querySelectorAll(".tiles, .panel, .two").forEach(function (e) { e.hidden = true; });
    $("maj").textContent = "";
    return;
  }

  function osOf(name) { return /\.exe$/i.test(name) ? "win" : (/\.deb$/i.test(name) ? "ubu" : null); }
  function todayMg() {   // date du jour à Madagascar (UTC+3), comme le relevé
    return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function label(iso) { var p = iso.split("-"); return p[2] + "/" + p[1]; }

  function sumByOs(assets) {
    var s = { win: 0, ubu: 0 };
    Object.keys(assets).forEach(function (k) { var o = osOf(k); if (o) s[o] += assets[k]; });
    return s;
  }

  function load() {
    $("maj").textContent = "Chargement…";
    var live = fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases?per_page=100",
                     { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("API GitHub " + r.status); return r.json(); });
    var hist = fetch("https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/stats/stats-history.json?t=" + Date.now(),
                     { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { days: [] }; })
      .catch(function () { return { days: [] }; });
    Promise.all([live, hist]).then(function (res) { render(res[0], res[1]); })
      .catch(function (e) { $("maj").textContent = "Impossible de charger les chiffres (" + e.message + "). Réessayez dans un instant."; });
  }

  function render(releases, history) {
    // ---- Chiffres en direct
    var now = {}, versions = [];
    releases.forEach(function (r) {
      var v = { tag: r.tag_name, win: 0, ubu: 0 };
      (r.assets || []).forEach(function (a) {
        var o = osOf(a.name);
        if (!o) return;
        now[r.tag_name + "/" + a.name] = a.download_count;
        v[o] += a.download_count;
      });
      versions.push(v);
    });
    var cur = sumByOs(now);
    var total = cur.win + cur.ubu;

    // ---- Série quotidienne : relevés + aujourd'hui en direct
    var today = todayMg();
    var days = (history.days || []).filter(function (d) { return d.date < today; })
      .map(function (d) { return { date: d.date, cum: sumByOs(d.assets) }; });
    days.push({ date: today, cum: cur });
    // jours manquants (relevé non passé) : on garde le dernier cumul connu
    var filled = [];
    for (var i = 0; i < days.length; i++) {
      if (i > 0) {
        for (var d = addDays(days[i - 1].date, 1); d < days[i].date; d = addDays(d, 1)) {
          filled.push({ date: d, cum: days[i - 1].cum });
        }
      }
      filled.push(days[i]);
    }
    filled.forEach(function (d, k) {
      var prev = k > 0 ? filled[k - 1].cum : { win: 0, ubu: 0 };
      d.win = Math.max(0, d.cum.win - prev.win);
      d.ubu = Math.max(0, d.cum.ubu - prev.ubu);
      d.total = d.cum.win + d.cum.ubu;
    });
    var last30 = filled.slice(-30);
    var sumLast = function (n) { return filled.slice(-n).reduce(function (s, d) { return s + d.win + d.ubu; }, 0); };

    // ---- Tuiles
    $("t-total").textContent = fmt(total);
    $("t-win").textContent = fmt(cur.win);
    $("t-ubu").textContent = fmt(cur.ubu);
    $("t-win-pct").textContent = total ? Math.round(100 * cur.win / total) + " %" : "";
    $("t-ubu-pct").textContent = total ? Math.round(100 * cur.ubu / total) + " %" : "";
    var latest = releases.filter(function (r) { return !r.draft && !r.prerelease; })[0];
    $("t-version").textContent = latest ? "Dernière version : " + latest.tag_name : "";
    $("t-today").textContent = fmt(sumLast(1));
    $("t-7").textContent = fmt(sumLast(7));
    $("t-30").textContent = fmt(sumLast(30));

    // ---- Tableaux
    $("versions").innerHTML = versions.map(function (v) {
      return "<tr><td>" + v.tag + "</td><td>" + fmt(v.win) + "</td><td>" + fmt(v.ubu) + "</td><td><b>" + fmt(v.win + v.ubu) + "</b></td></tr>";
    }).join("") || "<tr><td colspan='4'>Aucune version publiée</td></tr>";
    $("daily-table").innerHTML = filled.slice().reverse().map(function (d) {
      return "<tr><td>" + d.date + "</td><td>" + fmt(d.win) + "</td><td>" + fmt(d.ubu) + "</td><td>" + fmt(d.win + d.ubu) + "</td><td>" + fmt(d.total) + "</td></tr>";
    }).join("");

    barChart($("chart-daily"), last30);
    lineChart($("chart-total"), last30);
    var upd = history.updated ? new Date(history.updated).toLocaleString("fr-FR") : "aucun relevé encore";
    $("maj").textContent = "Chiffres en direct · dernier relevé quotidien : " + upd;
  }

  // ------------------------------------------------------------------ outils SVG
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function frame(box, maxV, n) {
    box.innerHTML = "";
    var W = 960, H = 260, m = { l: 44, r: 12, t: 12, b: 28 };
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "xMidYMid meet" }, box);
    var g = el("g", { class: "axis" }, svg);
    var ym = niceMax(maxV), steps = 4;
    for (var i = 0; i <= steps; i++) {
      var val = ym * i / steps, y = m.t + (H - m.t - m.b) * (1 - i / steps);
      el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? "baseline" : "gridline" }, g);
      var t = el("text", { x: m.l - 8, y: y + 4, "text-anchor": "end" }, g);
      t.textContent = fmt(Math.round(val));
    }
    return { svg: svg, g: g, W: W, H: H, m: m, ym: ym, pw: W - m.l - m.r, ph: H - m.t - m.b, n: n };
  }
  function xLabels(f, data) {
    var every = Math.max(1, Math.ceil(data.length / 8));
    data.forEach(function (d, i) {
      if (i % every !== 0 && i !== data.length - 1) return;
      var x = f.m.l + f.pw * (i + 0.5) / data.length;
      var t = el("text", { x: x, y: f.H - 8, "text-anchor": "middle" }, f.g);
      t.textContent = label(d.date);
    });
  }

  var tip = $("tip");
  function showTip(evt, html) {
    tip.innerHTML = html; tip.hidden = false;
    var x = evt.clientX + 14, y = evt.clientY + 14;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = evt.clientX - tip.offsetWidth - 14;
    if (y + tip.offsetHeight > window.innerHeight - 8) y = evt.clientY - tip.offsetHeight - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }
  function row(sw, name, v) { return "<div class='row'><span>" + (sw ? "<i class='sw " + sw + "'></i>" : "") + name + "</span><b>" + fmt(v) + "</b></div>"; }

  // Barres empilées Windows / Ubuntu par jour (2 px d'écart entre segments, extrémités arrondies)
  function barChart(box, data) {
    var maxV = Math.max.apply(null, data.map(function (d) { return d.win + d.ubu; }).concat([1]));
    var f = frame(box, maxV, data.length);
    var slot = f.pw / data.length, bw = Math.max(4, Math.min(28, slot * 0.6));
    var y = function (v) { return f.m.t + f.ph * (1 - v / f.ym); };
    data.forEach(function (d, i) {
      var cx = f.m.l + slot * (i + 0.5), x = cx - bw / 2;
      var base = y(0);
      if (d.win > 0) {
        var hw = base - y(d.win);
        el("rect", { x: x, y: base - hw, width: bw, height: Math.max(0, hw - (d.ubu > 0 ? 1 : 0)), rx: d.ubu > 0 ? 0 : 4, fill: COL.win }, f.svg);
      }
      if (d.ubu > 0) {
        var top = y(d.win + d.ubu), bottom = y(d.win) - (d.win > 0 ? 1 : 0);
        el("rect", { x: x, y: top, width: bw, height: Math.max(0, bottom - top), rx: 4, fill: COL.ubu }, f.svg);
      }
      var hit = el("rect", { x: cx - slot / 2, y: f.m.t, width: slot, height: f.ph, class: "hit" }, f.svg);
      hit.addEventListener("mousemove", function (e) {
        showTip(e, "<b>" + d.date + "</b>" + row("sw-win", "Windows", d.win) + row("sw-ubu", "Ubuntu", d.ubu) + row("", "Total du jour", d.win + d.ubu));
      });
      hit.addEventListener("mouseleave", hideTip);
    });
    xLabels(f, data);
    if (data.every(function (d) { return d.win + d.ubu === 0; })) {
      el("text", { x: f.W / 2, y: f.H / 2, "text-anchor": "middle", class: "empty" }, f.svg).textContent = "Pas encore de téléchargement sur cette période";
    }
  }

  // Courbe du total cumulé (une seule série : pas de légende) avec réticule
  function lineChart(box, data) {
    var maxV = Math.max.apply(null, data.map(function (d) { return d.total; }).concat([1]));
    var f = frame(box, maxV, data.length);
    var slot = f.pw / data.length;
    var px = function (i) { return f.m.l + slot * (i + 0.5); };
    var py = function (v) { return f.m.t + f.ph * (1 - v / f.ym); };
    var dpath = data.map(function (d, i) { return (i ? "L" : "M") + px(i).toFixed(1) + " " + py(d.total).toFixed(1); }).join(" ");
    el("path", { d: dpath, fill: "none", stroke: COL.line, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, f.svg);
    var cross = el("line", { y1: f.m.t, y2: f.m.t + f.ph, class: "cross", visibility: "hidden" }, f.svg);
    var dot = el("circle", { r: 5, fill: COL.line, stroke: "#221D19", "stroke-width": 2, visibility: "hidden" }, f.svg);
    var last = data[data.length - 1];
    el("circle", { cx: px(data.length - 1), cy: py(last.total), r: 4, fill: COL.line }, f.svg);
    var hit = el("rect", { x: f.m.l, y: f.m.t, width: f.pw, height: f.ph, class: "hit" }, f.svg);
    hit.addEventListener("mousemove", function (e) {
      var r = f.svg.getBoundingClientRect();
      var vx = (e.clientX - r.left) * f.W / r.width;
      var i = Math.max(0, Math.min(data.length - 1, Math.floor((vx - f.m.l) / slot)));
      cross.setAttribute("x1", px(i)); cross.setAttribute("x2", px(i)); cross.setAttribute("visibility", "visible");
      dot.setAttribute("cx", px(i)); dot.setAttribute("cy", py(data[i].total)); dot.setAttribute("visibility", "visible");
      showTip(e, "<b>" + data[i].date + "</b>" + row("", "Total cumulé", data[i].total) + row("sw-win", "Windows", data[i].cum.win) + row("sw-ubu", "Ubuntu", data[i].cum.ubu));
    });
    hit.addEventListener("mouseleave", function () { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); hideTip(); });
    xLabels(f, data);
  }

  $("refresh").addEventListener("click", load);
  load();
})();
