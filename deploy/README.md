# Déployer et exploiter Redak Esport

Le projet fonctionne en local sans compte tiers. Ce guide prépare un serveur Linux avec Docker Compose et Node.js 24. La configuration de production est indépendante du Compose local et n'utilise pas ses comptes de démonstration.

## Installation serveur

1. Installer le dépôt dans `/opt/redakesport` et copier `.env.production.example` vers `.env.production` (fichier ignoré par Git).
2. Renseigner `APP_DOMAIN` avec le domaine seul, `ACME_EMAIL` et un `POSTGRES_PASSWORD` généré avec `openssl rand -hex 32`. Protéger le fichier avec `chmod 600 .env.production`.
3. Pointer les DNS A/AAAA du domaine vers le serveur. Ouvrir les ports TCP 80/443 ; UDP 443 est facultatif pour HTTP/3.
4. Valider et lancer cette configuration seule :

```sh
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

Caddy obtient et renouvelle le certificat HTTPS. PostgreSQL et l'API n'ont aucun port publié ; le proxy est le seul point d'entrée. L'API utilise des cookies `Secure` et `HttpOnly`. Les configurations incomplètes, une origine non HTTPS ou un mot de passe de base insuffisant font échouer le démarrage avant les migrations. Les migrations s'appliquent automatiquement. Les journaux Docker sont limités à trois fichiers de 10 Mo par service.

Vérifier ensuite `https://<domaine>/api/health` et les parcours inscription, connexion, création de compétition, déclaration et confirmation des scores. Les adaptateurs externes doivent aussi être testés avec leurs vrais comptes avant ouverture au public.

## Services facultatifs

- Discord : renseigner les deux paramètres OAuth et enregistrer exactement `https://<domaine>/api/auth/discord/callback` dans l'application Discord. Le bouton apparaît uniquement lorsque le service est configuré.
- Emails : renseigner les paramètres SMTP et l'expéditeur autorisé par le fournisseur. Le port 587 utilise STARTTLS ; pour 465, activer généralement `SMTP_SECURE=true`. `SMTP_REQUIRE_TLS=true` est activé par défaut en production. La boîte [Mailpit locale](https://mailpit.axllent.org/docs/install/docker/) du Compose de développement ne relaie aucun courrier externe.
- Twitch : renseigner l'identifiant client et le jeton d'accès lorsque cette intégration est utilisée.

Après modification de `.env.production`, recréer le service pour charger les nouvelles valeurs :

```sh
docker compose --env-file .env.production -f compose.production.yml up -d app
```

## Sauvegarde et restauration de contrôle

```sh
node scripts/ops/backup.mjs --compose compose.production.yml --env-file .env.production --output var/backups/production
node scripts/ops/verify-backup.mjs --latest --output var/backups/production
```

Le backup contient une archive PostgreSQL, les rôles SQL nécessaires et les fichiers téléversés. Une interruption brève de l'API assure un point cohérent entre base et fichiers. Le service est redémarré même si la sauvegarde échoue. Les archives ne sont publiées qu'une fois complètes ; la rétention s'applique aux sauvegardes reconnues, jamais aux autres fichiers du dossier. `--output` choisit le dossier et `--retention-days` sa durée de conservation.

La vérification contrôle les empreintes et restaure dans une base Docker isolée, sans port public. Elle compare les nombres de lignes et les fichiers, puis détruit uniquement ses ressources temporaires. Elle ne remplace pas les données en service. Utiliser `--backup <dossier>` pour contrôler une archive précise. Conserver également une copie chiffrée hors du serveur dans le stockage de sauvegarde choisi ; le dossier local seul ne couvre pas la perte du serveur.

Après un arrêt brutal du processus ou du serveur, vérifier l'état du service `app`. Un verrou `var/ops/backup-*.lock` peut subsister : ne le retirer qu'après vérification qu'aucune sauvegarde n'est encore en cours. Le redémarrage de l'application est assuré lors des erreurs gérées et interruptions normales, pas lors d'un `SIGKILL` ou d'une panne de l'hôte.

## Surveillance et automatisation

```sh
node --env-file=.env.production scripts/ops/monitor.mjs --backup-dir var/backups/production --state var/monitor-production.json
```

Le contrôle vérifie la réponse PostgreSQL de l'API et une sauvegarde complète datant de moins de 26 heures. Il écrit un état privé et sort avec un code non nul si un contrôle échoue. `MONITOR_URL` remplace l'URL calculée à partir du domaine. `MONITOR_WEBHOOK_URL` est facultatif : le destinataire doit accepter un POST JSON `{type,text,checkedAt}`. Une notification est envoyée après deux échecs consécutifs, une autre au rétablissement ; un échec d'envoi est réessayé au contrôle suivant. Sans destinataire, les résultats restent dans les journaux.

Les fichiers `deploy/systemd/` utilisent `/opt/redakesport` et `/usr/bin/node`. Adapter ces chemins si nécessaire, puis installer sur le serveur :

```sh
sudo cp deploy/systemd/redakesport-* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now redakesport-backup.timer redakesport-verify.timer redakesport-monitor.timer
sudo systemctl list-timers 'redakesport-*'
```

Sauvegarde quotidienne vers 03 h, restauration de contrôle le dimanche vers 04 h, surveillance chaque minute. Les horaires suivent le fuseau du serveur. Les unités d'exploitation ont besoin d'accéder à Docker et aux fichiers privés du déploiement. Les journaux se consultent avec `journalctl -u redakesport-backup.service`, `redakesport-verify.service` ou `redakesport-monitor.service`.

Ces unités ne sont ni installées ni activées automatiquement lors de l'exécution locale. Les destinations de sauvegarde externe et d'alerte restent à choisir avec l'environnement d'hébergement.

Références : [HTTPS automatique Caddy](https://caddyserver.com/docs/automatic-https), [reverse proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [réseaux Docker Compose](https://docs.docker.com/reference/compose-file/networks/).
