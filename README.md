# Redak Esport

Application de compétition esport : joueurs, clubs, tournois, résultats, matchmaking et diffusion. **PostgreSQL 17 autonome + API Node.js 24/Fastify + React/TypeScript**. Aucun service Supabase, clé publique de base de données ou Edge Function n’est nécessaire.

## Démarrer avec Docker

```sh
docker compose up --build -d
```

Ouvrir **http://localhost:5175**. PostgreSQL et les fichiers persistent dans deux volumes distincts. Les migrations s’appliquent au lancement de l’application. Créer un compte et choisir Joueur, Capitaine ou Organisateur. Le rôle Organisateur gère uniquement ses compétitions ; ce n’est pas un administrateur global des comptes.

Les valeurs du Compose sont prévues pour le développement local, avec des ports liés à `127.0.0.1`. Pour une installation sur serveur, choisir un mot de passe PostgreSQL fort, définir `APP_ORIGIN` sur l’adresse HTTPS exacte et `NODE_ENV=production`, puis placer un reverse proxy HTTPS devant le port 3001. Les cookies de session sont alors `Secure` et `HttpOnly`. Ne pas exposer PostgreSQL sur Internet.

## Développement

Prérequis : Node.js 24, npm et Docker.

```sh
npm ci
cp .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

- Interface : http://localhost:5173
- API : http://127.0.0.1:3001/api/health
- PostgreSQL : `localhost:5440`, base `redakesport`

Le navigateur utilise `/api` sur la même origine ; Vite transmet ces requêtes à l’API. La configuration de connexion PostgreSQL reste exclusivement côté serveur. L’ancien fichier `apps/web/.env`, s’il existe déjà, n’est plus utilisé par le client applicatif.

## Démonstration FC27

EA SPORTS FC 27 est disponible dans le catalogue, la création de tournoi et le matchmaking. Les éditions précédentes restent disponibles. La liste des tournois affiche le jeu et le BO, et propose un filtre par jeu.

Pour remplir volontairement la base locale :

```sh
npm run db:seed:demo
# Ou, avec l’application Docker construite :
docker compose exec app npm run db:seed:demo
```

Cette commande applique les migrations puis ajoute **58 comptes** (48 joueurs, 8 capitaines et 2 organisateurs), **8 clubs de 5 membres** et **14 compétitions FC27** : 2 ouvertes aux inscriptions, 5 en cours, 5 terminées, 1 brouillon privé et 1 annulée. Les cinq formats sont représentés en cours et terminés. Résultats fictifs, qualifications, classements, ELO, forfait, litige et demandes à valider sont générés par les procédures métier. Aucun compte tiers, email ou webhook n’est utilisé.

| Rôle | Emails | Mot de passe initial |
| --- | --- | --- |
| Organisateur | `organisateur@example.test`, `organisateur02@example.test` | `RedakTest!2026` |
| Capitaine | `capitaine@example.test`, puis `capitaine02@example.test` à `capitaine08@example.test` | `RedakTest!2026` |
| Joueur | `joueur@example.test`, puis `joueur02@example.test` à `joueur48@example.test` | `RedakTest!2026` |

Le premier organisateur possède les compétitions actives. Le premier capitaine dispose d’un club, de candidatures en attente et peut inscrire son club au Clubs Open. Le premier joueur participe aux compétitions solo et à son club. La connexion se fait par email sur `/login`.

Le remplissage est explicite, transactionnel et relançable : les comptes existants, mots de passe, tournois et résultats déjà créés sont conservés. Il n’est jamais exécuté au démarrage et refuse `NODE_ENV=production`. Les dates sont calculées lors de la première création ; relancer la commande ne réinitialise pas les compétitions que tu as manipulées.

## Parcours disponibles

- Compte par email et mot de passe, choix du rôle, profil avec avatar, déconnexion et sessions révocables. Mots de passe hachés avec scrypt.
- Création de club avec son capitaine, candidatures et validation atomique de l’effectif.
- Création de tournoi, ouverture des inscriptions, approbation/refus/retrait, capacité et échéance contrôlées en base.
- Élimination simple, double élimination avec finale décisive, round robin, poules suivies d’un tableau final et rondes suisses.
- Matchs en BO1, BO3 ou BO5, choisis à la création et hérités par toutes les rondes. En BO1, on saisit le score du jeu ; en BO3/BO5, les manches gagnées (2 ou 3 nécessaires). PostgreSQL rejette les séries incomplètes, nulles ou dépassant le seuil.
- Forfait motivé par l’organisateur, ou abandon de son propre match par le joueur/capitaine. Confirmation explicite, historique conservé, score administratif 1–0/2–0/3–0, progression et classement mis à jour, aucun mouvement d’ELO. Le participant reste inscrit aux éventuelles rondes suivantes.
- Arbre des rencontres avec branches réelles, vue symétrique ou classique, repêchages en pointillés, zoom et navigation vers la finale. Les poules et rondes suisses restent présentées par ronde.
- Génération des exemptions et propagation dans des emplacements fixes du tableau. Le tournoi se termine automatiquement lorsque ses matchs sont terminés.
- Deux déclarations de score concordantes sont requises. Une même équipe ne peut pas confirmer son propre résultat. Les désaccords sont arbitrés par le propriétaire du tournoi. En matchmaking solo, les joueurs peuvent corriger leurs déclarations jusqu’à un accord.
- Classements et ELO des joueurs **et des clubs**, écrits une seule fois dans la transaction du résultat.
- Matchmaking solo par jeu/région, écart de 200 ELO, lobby partagé, validation « prêt », match puis soumission du résultat.
- Programmation des matchs, chronologie, statistiques, export iCalendar en UTC.
- Suivi des diffusions et des replays ; overlays OBS `/overlay/<match-id>?view=scoreboard|winner|bracket`. Un tournoi public est nécessaire pour une source OBS sans session.
- Pièces jointes de score privées, accessibles aux participants et à leur organisateur. Stockage local dans le volume `uploads`.

Les écrans de suivi s’actualisent toutes les cinq secondes lorsqu’ils sont visibles (trente secondes pour les tableaux de plus de 1 000 matchs). Le matchmaking est déclenché par les clients en recherche, sans cron externe. Les serveurs de jeu et le transport vidéo restent fournis par les jeux et OBS/Twitch/YouTube/Kick.

Pour les rondes suisses, le nombre de rondes vaut `ceil(log2(n))`. Chaque ronde est appariée entièrement, sans rencontre répétée. Les voisins sont examinés par proximité de points ; un algorithme de couplage maximum avec contraction des cycles impairs corrige les impasses du choix initial. Pour un nombre impair de participants, l’exemption revient au moins bien classé n’en ayant jamais reçu et permettant d’apparier tous les autres. Une exemption donne 3 points et ne modifie pas l’ELO.

Le classement suisse suit : points, **Buchholz** (somme des points finaux/actuels des adversaires rencontrés), **Sonneborn-Berger** (points des adversaires battus et moitié des points de ceux contre lesquels on a fait nul), différence de scores, identifiant. Les résultats par forfait comptent au classement et pour ces départages ; les exemptions n’ont pas d’adversaire. Les règles et valeurs BH/SB sont visibles dans l’application. Le couplage par chemins augmentants suit le principe décrit dans la [documentation de référence sur la méthode d’Edmonds](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.matching.max_weight_matching.html) ; l’implémentation PostgreSQL est testée contre une recherche exhaustive et sur 256 participants. Ce règlement esport ne revendique pas une homologation d’échecs.

En élimination, le classement final suit la progression dans le tableau : champion, finaliste, puis places partagées pour les éliminés du même tour, sans petite finale. Une annulation bloque les nouvelles déclarations, les forfaits et les arbitrages sans effacer les résultats déjà confirmés. Le format hybride utilise deux poules, puis A1–B2 et B1–A2 ; quatre participants minimum sont nécessaires.

## Intégrations facultatives

Les fonctions locales de compétition marchent sans identifiant tiers.

- Discord OAuth : `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, callback `${APP_ORIGIN}/api/auth/discord/callback`. Un compte existant ayant le même email ne sera pas automatiquement lié à Discord.
- Webhooks Discord : configuration par utilisateur dans Intégrations. L’envoi n’a lieu que sur action du bouton de test ; aucun bot de commandes n’est annoncé comme installé.
- Récupération de mot de passe : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, et éventuellement `SMTP_SECURE=true`. Un lien expire après 30 minutes et son utilisation révoque les sessions existantes.
- API Twitch : `TWITCH_CLIENT_ID`, `TWITCH_ACCESS_TOKEN` pour l’adaptateur de statut de chaîne.

## Validation

```sh
npm run check                     # lint, TypeScript/build, tests métier/API
npx playwright install chromium
npm run test:e2e                   # parcours navigateur, ordinateur et mobile
npm audit
```

Les tests créent et utilisent exclusivement une base terminant par `_test` (par défaut `redakesport_test`). `TEST_DATABASE_URL` permet d’en changer la connexion. Les fixtures restent dans cette base isolée pour diagnostic ; elles ne modifient pas la base applicative. Les tests ne contactent ni Discord ni les fournisseurs de courrier réels. Les traces en cas d’échec sont dans `test-results/`.

## Organisation et exploitation

- `apps/web/src` : interface et client HTTP typé.
- `apps/api/src` : API, sessions, requêtes PostgreSQL paramétrées, stockage et génération de tableaux.
- `database/migrations` : schéma, droits SQL et transactions métier ; versions suivies dans `schema_migrations`.
- `tests` : tests des algorithmes, de l’API et des parcours navigateur.
- `design-mockup` : maquette de référence historique.

L’API n’expose ni SQL brut ni tables d’authentification. Les tables, champs, relations et actions accessibles sont contrôlés ; chaque requête applicative passe dans une transaction avec le rôle PostgreSQL de lecture ou d’utilisateur et l’identifiant de la session. Les procédures métier vérifient les autorisations et prennent les verrous nécessaires.

Pour sauvegarder les données locales :

```sh
docker compose exec -T db pg_dump -U redak -d redakesport > redakesport.sql
```

Sauvegarder aussi le volume `uploads`. Restaurer dans une base vide, vérifier les sauvegardes régulièrement et conserver les fichiers et la base du même point de sauvegarde. `docker compose down` conserve les volumes ; `down -v` les détruit.

La conversion du code ne copie pas automatiquement les données d’une ancienne installation Supabase. Un export de cette installation est nécessaire pour une reprise de données ; les anciens volumes et services externes ne sont pas supprimés par ce projet.
