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
      $("compteur-total").textContent = fmt(total);
      $("compteur-texte").textContent = total > 1 ? "téléchargements" : "téléchargement";
      $("compteur").hidden = false;
    })
    .catch(function () { /* hors ligne ou limite de l'API : les boutons mènent à la page des versions */ });
})();
