# Site Ankoay Studio

Site vitrine d'Ankoay Studio (logiciels sur mesure, Ankoay Central, Ankoay Academy) et page de
téléchargement d'AnkoayPlay. Site statique (HTML, CSS, JavaScript), sans serveur ni base de données.

- Adresse provisoire : https://ghislain-helison.github.io/ankoay-studio/
- Installeurs d'AnkoayPlay : onglet **Releases** de ce dépôt.

## Modifier les coordonnées
Ouvrez `assets/js/config.js` et remplissez `email`, `phone`, `whatsapp`, `facebookUrl`.
Un champ vide n'est pas affiché.

## Publier une nouvelle version d'AnkoayPlay
Créez une Release `vX.Y.Z` avec le `.exe` et le `.deb` en pièces jointes :

    gh release create v1.3.3 AnkoayPlay-1.3.3-Setup.exe ankoayplay_1.3.3_amd64.deb \
      --repo Ghislain-Helison/ankoay-studio --title "AnkoayPlay 1.3.3" --notes "Nouveautés…"

Le site pointe automatiquement vers la dernière version, sans modification.

## Compteur de téléchargements
Le compteur additionne les téléchargements de tous les `.exe` et `.deb` publiés dans les Releases
(chiffres tenus par GitHub, lus par l'API publique `api.github.com`). Il compte aussi les
téléchargements faits par le lien direct, hors du site.

## Passer sur votre nom de domaine
1. Achetez le domaine (ex. `ankoay-studio.mg` ou `ankoaystudio.com`).
2. Chez le registraire, ajoutez les enregistrements DNS de GitHub Pages :
   - `A` vers 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - ou `CNAME` `www` vers `ghislain-helison.github.io`
3. Dans GitHub : Settings → Pages → Custom domain → votre domaine, puis cochez « Enforce HTTPS ».
   (Cela crée un fichier `CNAME` dans le dépôt.)

Tous les liens du site sont relatifs : rien d'autre à changer.
Le site peut aussi être déplacé tel quel chez n'importe quel hébergeur (Cloudflare Pages, Netlify, OVH…).
