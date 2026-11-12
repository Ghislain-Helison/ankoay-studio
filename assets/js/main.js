// Site Ankoay Studio : menu mobile, coordonnées, liens de téléchargement et compteur.
(function () {
  "use strict";
  var cfg = window.ANKOAY_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  // ---- Année et ville
  $("annee").textContent = new Date().getFullYear();
  if (cfg.city) $("ville").textContent = cfg.city;

  // ---- Menu mobile
  var btn = document.querySelector(".menu-btn");
  var menu = $("menu");
  btn.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  // ---- En-tête qui se resserre au défilement
  var top = document.querySelector(".top");
  function onScroll() { top.classList.toggle("scrolled", window.scrollY > 20); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- Apparition des blocs au défilement (décalée pour les éléments d'un même groupe)
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(
    ".section .eyebrow, .section h2, .section-lead, .service, .steps li, .product, .play-head, " +
    ".video, .feature, .gallery figure, .download, .contact-card");
  if (!reduce && "IntersectionObserver" in window) {
    targets.forEach(function (el) {
      el.classList.add("reveal");
      var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) {
        return c.className === el.className.replace(" reveal", "") || c.classList.contains("reveal");
      });
      var i = siblings.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i, 4) * 0.09 + "s";
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
    // Filet de sécurité : tout bloc déjà à l'écran est affiché (arrivée par un lien #section,
    // navigateur qui n'a pas encore prévenu l'observateur…). Jamais de zone vide.
    var pending = false;
    function revealVisible() {
      pending = false;
      var h = window.innerHeight;
      targets.forEach(function (el) {
        if (!el.classList.contains("in") && el.getBoundingClientRect().top < h * 0.95) el.classList.add("in");
      });
    }
    window.addEventListener("scroll", function () {
      if (!pending) { pending = true; requestAnimationFrame(revealVisible); }
    }, { passive: true });
    window.addEventListener("load", revealVisible);
    window.addEventListener("hashchange", function () { setTimeout(revealVisible, 50); });
    setTimeout(revealVisible, 600);
    setTimeout(revealVisible, 1500);
  } else {
    targets.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Compteur qui monte jusqu'à sa valeur quand il devient visible
  function countUp(el, value) {
    if (reduce || value < 10) { el.textContent = fmt(value); return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(value * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---- Coordonnées : seules celles renseignées dans config.js sont affichées
  var list = $("contact-list");
  function addContact(label, value, href) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = href;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    var b = document.createElement("b");
    b.textContent = label;
    var s = document.createElement("span");
    s.textContent = value;
    a.appendChild(b);
    a.appendChild(s);
    li.appendChild(a);
    list.appendChild(li);
  }
  if (cfg.email) addContact("E-mail", cfg.email, "mailto:" + cfg.email);
  if (cfg.phone) addContact("Téléphone", cfg.phone, "tel:" + cfg.phone.replace(/\s+/g, ""));
  if (cfg.whatsapp) addContact("WhatsApp", "+" + cfg.whatsapp, "https://wa.me/" + cfg.whatsapp);
  if (cfg.facebookUrl) addContact("Facebook", "Page Ankoay Studio", cfg.facebookUrl);
  if (list.children.length) $("contact-empty").hidden = true;

  // « Demander une présentation » : pré-remplit l'objet de l'e-mail
  document.querySelectorAll("[data-subject]").forEach(function (a) {
    if (!cfg.email) return;
    a.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent("Présentation " + a.dataset.subject);
  });

  // ---- Téléchargements : liens vers la dernière version + compteur (API publique de GitHub)
  if (!cfg.githubOwner || !cfg.githubRepo) return;
  var base = "https://github.com/" + cfg.githubOwner + "/" + cfg.githubRepo;
  $("lien-versions").href = base + "/releases";
  var api = "https://api.github.com/repos/" + cfg.githubOwner + "/" + cfg.githubRepo + "/releases?per_page=100";

  function mo(bytes) { return Math.round(bytes / 1048576) + " Mo"; }
  function fmt(n) { return n.toLocaleString("fr-FR"); }

  fetch(api, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (releases) {
      var total = 0;
      releases.forEach(function (rel) {
        (rel.assets || []).forEach(function (a) {
          if (/\.(exe|deb)$/i.test(a.name)) total += a.download_count || 0;
        });
      });
      var latest = releases.filter(function (r) { return !r.draft && !r.prerelease; })[0];
      if (latest) {
        (latest.assets || []).forEach(function (a) {
          if (/\.exe$/i.test(a.name)) {
            $("dl-windows").href = a.browser_download_url;
            $("meta-windows").textContent = "64 bits · " + mo(a.size);
          } else if (/\.deb$/i.test(a.name)) {
            $("dl-ubuntu").href = a.browser_download_url;
            $("meta-ubuntu").textContent = "64 bits · " + mo(a.size);
            $("cmd-ubuntu").textContent = "sudo apt install ./" + a.name;
          }
        });
        var v = (latest.tag_name || "").replace(/^v/, "");
        if (v) $("version").textContent = "Version " + v + " · Gratuit · Sans abonnement · Sans publicité";
      }
      $("compteur-texte").textContent = total > 1 ? "téléchargements" : "téléchargement";
      $("compteur").hidden = false;
      var counter = $("compteur-total");
      if ("IntersectionObserver" in window) {
        var co = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { countUp(counter, total); co.disconnect(); }
        });
        co.observe(counter);
      } else {
        counter.textContent = fmt(total);
      }
    })
    .catch(function () { /* hors ligne ou limite de l'API : les boutons mènent à la page des versions */ });
})();
