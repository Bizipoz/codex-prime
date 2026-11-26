# Point par point

Un espace pour gérer ses patrons, suivre ses projets et consigner ses séances. L’interface est en français et démarre avec une bibliothèque vide.

## Organisation des fichiers

- `public/index.html` contient la structure des quatre vues et la boîte de dialogue des formulaires.
- `public/style.css` gère la mise en page responsive, les contrastes et les indicateurs de focus.
- `public/app.mjs` relie les formulaires, la navigation et l’affichage aux données.
- `public/data.mjs` contient la lecture et l’écriture des données, la recherche, les statistiques et le calcul des jours du calendrier.
- `tests/data.test.mjs` couvre les règles de données avec le lanceur de tests intégré à Node.js.

Les patrons, projets et activités sont enregistrés dans `localStorage` sous la clé `point-par-point.v1`. Les données sont propres au navigateur, au profil et à l’adresse utilisée. Effacer les données du site efface aussi le contenu de l’atelier. Chaque projet référence son patron et conserve sa taille, son avancement et ses notes. Le calendrier couvre la semaine en cours et les 51 semaines précédentes. Le journal fournit les dates et les totaux par jour sous forme de texte.
