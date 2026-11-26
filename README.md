# Point par point

Un atelier couture pour gérer ses patrons, suivre ses projets et consigner ses séances. L’interface est en français et démarre avec une bibliothèque vide.

## Lancer en local

Depuis la racine du dépôt, lancez `python3 -m http.server 8000 --directory public`, puis ouvrez <http://localhost:8000>. Le serveur HTTP permet au navigateur de charger les modules JavaScript.

## Organisation des fichiers

- `public/index.html` contient la structure des quatre vues et la boîte de dialogue des formulaires.
- `public/style.css` gère la mise en page responsive, les contrastes et les indicateurs de focus.
- `public/app.mjs` relie les formulaires, la navigation et l’affichage aux données.
- `public/data.mjs` contient la lecture et l’écriture des données, la recherche, les statistiques et le calcul des jours du calendrier.
- `tests/data.test.mjs` couvre les règles de données avec le lanceur de tests intégré à Node.js.

Les patrons, projets et activités sont enregistrés dans `localStorage` sous la clé `point-par-point.v1`. Les données sont propres au navigateur, au profil et à l’adresse utilisée. Effacer les données du site efface aussi le contenu de l’atelier. Chaque projet référence son patron et conserve sa taille, son avancement et ses notes. Le calendrier couvre la semaine en cours et les 51 semaines précédentes. Le journal fournit les dates et les totaux par jour sous forme de texte.

## Tester

Lancez `node --test` depuis la racine avec Node.js 20 ou plus récent.

Dans le navigateur, vérifiez l’ajout et la modification d’un patron, la recherche avec et sans accents, puis le filtrage par univers. Créez deux projets depuis la même fiche patron, changez l’avancement de l’un et vérifiez le tableau de bord. Déclarez deux activités le même jour, puis rechargez la page pour vérifier le calendrier et la persistance. Au clavier, vérifiez le lien d’évitement, l’ouverture et la fermeture des formulaires, la visibilité du focus et son retour après fermeture.

## Déployer sur Cloudflare Pages

Connectez le dépôt dans Cloudflare Pages et choisissez la branche que vous souhaitez publier. Sélectionnez le préréglage **Aucun**, laissez vide la commande de build et définissez **public** comme répertoire de sortie. Le dossier contient tous les fichiers servis par Pages.
