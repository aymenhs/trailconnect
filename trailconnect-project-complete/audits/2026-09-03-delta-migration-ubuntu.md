# Delta de migration vers le serveur Ubuntu

**Date :** 3 septembre 2026
**Question :** que reste-t-il de lié à Manus, et quel est l'écart à combler ?
**Méthode :** inventaire exhaustif des références `manus`/`forge` dans le code source, hors `node_modules`, `dist/` et `audits/`.

---

## Verdict

**Cinq dépendances runtime subsistent, dont trois bloquantes.** Le travail de la veille a supprimé tout l'outillage Manus *de développement* — modules serveur morts, collecteur de debug, plugins de build en production. Ce qui reste est le **socle de services** : authentification, stockage, cartes, notification propriétaire, analytics.

L'application ne démarre pas de façon autonome aujourd'hui : sans `api.manus.im` personne ne peut se connecter, et sans `forge.manus.ai` aucune image ni trace GPX ne s'affiche.

Estimation globale : **2 à 3 semaines**, dont ~60 % sur l'authentification.

| # | Dépendance | Bloquant | Effort | Où |
|---|---|---|---|---|
| 1 | **Authentification OAuth Manus** | 🔴 oui | L (1–2 sem.) | `server/_core/sdk.ts`, `oauth.ts`, `client/src/const.ts` |
| 2 | **Stockage Forge (images, GPX)** | 🔴 oui | M (3–4 j) | `server/storage.ts`, `_core/storageProxy.ts` |
| 3 | **15 assets hébergés chez Manus** | 🔴 oui | S (½ j) | `ResponsiveCoverImage.tsx`, `groupCoverLibrary.ts`, `Home.tsx` |
| 4 | **Proxy Google Maps Forge** | 🟠 dégradé | S (2 h) | `client/src/components/Map.tsx` |
| 5 | **Notification propriétaire** | 🟢 non | XS (1 h) | `server/_core/notification.ts` |
| 6 | Analytics Umami hébergé | 🟢 non | S (2 h) | `client/src/lib/analyticsConsent.ts` |
| 7 | Base TiDB Cloud | 🟠 oui | M (1–2 j) | `DATABASE_URL` |
| 8 | Résidus de template | 🟢 non | XS (30 min) | `template.json`, `.project-config.json`, devDep |

---

## 1. Authentification — le gros morceau 🔴

**Ce qui appelle Manus :**

- `server/_core/sdk.ts` → `api.manus.im`, trois endpoints RPC :
  - `ExchangeToken` (code → jeton d'accès)
  - `GetUserInfo` (jeton → identité)
  - `GetUserInfoWithJwt` (utilisé pour la synchro d'un utilisateur absent de la base **et pour les sessions cron**)
- `server/_core/oauth.ts` → route de rappel `/api/oauth/callback`
- `client/src/const.ts` → redirige vers `manus.im/app-auth`

**Ce qui n'est PAS lié à Manus, et qu'on garde :**

- La session elle-même est un **JWT `jose` signé localement** (`signSession` / `verifySession`) avec `JWT_SECRET`. Rien à refaire.
- Le garde CSRF sur le rappel OAuth (nonce à usage unique dans un cookie `__Host-`) est une implémentation correcte, réutilisable telle quelle.
- Le cookie de session, désormais en `sameSite: lax`.

**Bonne nouvelle sur la profondeur du couplage :** l'identité Manus (`openId`) n'apparaît que dans **5 lignes** hors du SDK ([db.ts:198](../server/db.ts#L198), [:202](../server/db.ts#L202), [:216](../server/db.ts#L216), [:226](../server/db.ts#L226), [:232](../server/db.ts#L232)) et une colonne `varchar(64)` unique. C'est un identifiant opaque : il peut rester tel quel, ou accueillir une nouvelle identité (`google:1234…`, `email:hash`) sans toucher au reste du modèle.

**Ce qu'il faut construire :**

1. Choisir le mécanisme : lien magique par courriel, ou OAuth direct Google/Apple. Le second évite d'avoir à envoyer des courriels tout de suite.
2. Remplacer `OAuthService` par le fournisseur choisi, en conservant `signSession`/`verifySession` intacts.
3. Adapter `/api/oauth/callback` — la structure et le garde CSRF restent.
4. Remplacer `startLogin()` côté client.
5. **Prévoir la bascule des comptes existants** : les `openId` Manus actuels devront être rattachés aux nouvelles identités (par courriel, si les adresses sont connues), sinon les comptes sont orphelins.
6. Retirer `server/_core/types/manusTypes.ts` et la dépendance `axios` si plus rien ne l'utilise.

> ⚠️ **Point d'attention lié aux secrets non traités.** Le `JWT_SECRET` actuel est versionné en clair. Le régénérer invalide toutes les sessions — ce qui tombe bien au moment de la bascule d'authentification. Les deux opérations doivent se faire ensemble.

> ⚠️ **Sessions cron.** `authenticateRequest` reconnaît un préfixe `cron_` et valide la tâche via `GetUserInfoWithJwt`. La route `/api/scheduled/finalize-account-deletions` en dépend. Sur Ubuntu, remplacer par un `systemd timer` ou une entrée cron appelant la route avec un jeton partagé.

## 2. Stockage 🔴

`server/storage.ts` et `server/_core/storageProxy.ts` passent par `forge.manus.ai` : une URL présignée pour écrire (PUT direct vers S3), une redirection 307 pour lire.

**Portée réelle :** tous les téléversements — images de couverture de sortie, avatars, photos de publication, traces GPX/KML.

**Bonne nouvelle :** l'interface est propre et isolée — `storagePut`, `storageGet`, `storageGetSignedUrl`. Trois fonctions à réimplémenter, aucun appelant à modifier. Elles ne sont utilisées qu'aux [db.ts:7052](../server/db.ts#L7052), [:7066](../server/db.ts#L7066), [:7081](../server/db.ts#L7081).

**Deux options :**

| Option | Avantage | Inconvénient |
|---|---|---|
| **Disque local + service statique** | Le plus simple ; largement suffisant sur 256 Go SSD | Sauvegarde à gérer soi-même ; pas de réplication |
| **MinIO (compatible S3, Docker)** | `@aws-sdk/client-s3` est **déjà en dépendance** (et actuellement inutilisé) | ~200 Mo de RAM en plus |

**Point structurant :** le préfixe d'URL `/manus-storage/` est **écrit en base** dans `gpxUrl`, `coverImageUrl`, `avatarUrl`, `routeImageUrl`, `imageUrl`… et **validé côté serveur** ([hikingValidation.ts:130](../server/hikingValidation.ts#L130), [:178](../server/hikingValidation.ts#L178), [:344](../server/hikingValidation.ts#L344)).

Deux stratégies :

- **Conserver le préfixe `/manus-storage/`** et ne changer que ce qu'il y a derrière la route. Zéro migration de données, mais un nom trompeur qui restera.
- **Renommer en `/media/`** — plus propre — mais il faut alors un `UPDATE` de réécriture sur toutes les colonnes d'URL, plus l'ajustement des trois refine Zod et du `navigateFallbackDenylist` / `runtimeCaching` du service worker ([vite.config.ts:229](../vite.config.ts#L229), [:246](../vite.config.ts#L246)).

Recommandation : **renommer**, en profitant de la migration de base, et garder `/manus-storage/` en alias de lecture le temps d'une transition.

## 3. Quinze assets hébergés chez Manus 🔴

Ce sont des images **livrées avec l'application**, pas du contenu utilisateur. Elles disparaîtront le jour où l'accès Forge s'arrête :

- 7 images d'ambiance : `trailconnect-hero*`, `trailconnect-alpine*`, `trailconnect-ridge*`, `trailconnect-event-*` — [ResponsiveCoverImage.tsx](../client/src/components/ResponsiveCoverImage.tsx), [Home.tsx:238](../client/src/pages/Home.tsx#L238)
- 6 couvertures de groupe : `mountain-river`, `alpine-lake`, `blue-lake`, `trail-hikers`, `forest-group`, `mountain-trail` — [groupCoverLibrary.ts](../client/src/lib/groupCoverLibrary.ts)

**À faire, tant que l'accès Forge fonctionne encore** : les télécharger, les placer dans `client/public/media/`, et remplacer les chemins. Elles passeront alors par le précache du service worker — un gain au passage, puisqu'elles seront disponibles hors ligne.

> C'est l'action la plus urgente du lot : elle a une **fenêtre de temps**. Une fois l'accès Manus coupé, ces fichiers sont perdus.

## 4. Cartes 🟠

[Map.tsx:92](../client/src/components/Map.tsx#L92) charge le script Google Maps via `forge.butterfly-effect.dev/v1/maps/proxy`, avec `VITE_FRONTEND_FORGE_API_KEY` exposée dans le navigateur.

**Correctif :** créer une clé Google Maps dans votre propre projet Google Cloud, la **restreindre par référent HTTP** à votre domaine, et charger `maps.googleapis.com` directement. `VITE_GOOGLE_MAP_ID` est déjà prévu dans le code (ajouté hier) — il ne reste que l'URL et la clé à basculer.

Vous aviez indiqué que garder Google Maps est acceptable. Alternative sans coût récurrent si vous changez d'avis : MapLibre + tuiles OpenStreetMap, qui ouvre en plus la voie aux cartes réellement hors ligne (les conditions d'utilisation de Google interdisent la mise en cache des tuiles).

## 5. Notification propriétaire 🟢

[notification.ts](../server/_core/notification.ts) appelle `forge.manus.ai` pour prévenir le propriétaire du projet. Un seul appelant : `system.notifyOwner`, réservé aux administrateurs.

**Le plus simple : supprimer le module et la procédure.** Ils ne servent pas les utilisateurs. Si un canal d'alerte exploitant est souhaité, un webhook (Discord, Slack, ntfy) le remplace en quelques lignes — et ce serait le bon moment pour poser la brique d'envoi de courriel qui manque pour les notifications aux participants (P1-13 de l'audit).

## 6. Analytics 🟢

Depuis hier, le script ne se charge qu'après consentement explicite. Il pointe encore vers `manus-analytics.com` via `VITE_ANALYTICS_ENDPOINT`.

**Correctif :** Umami auto-hébergé (Docker, ~300 Mo) sur la même machine, puis changer la variable d'environnement. Aucun code à modifier — [analyticsConsent.ts](../client/src/lib/analyticsConsent.ts) lit l'endpoint depuis l'environnement. Auto-héberger règle aussi proprement la question Loi 25 : les données restent chez vous.

## 7. Base de données 🟠

`DATABASE_URL` pointe vers TiDB Cloud (`gateway02.us-east-1.prod.aws.tidbcloud.com`). TiDB parle le protocole MySQL : les **51 migrations Drizzle s'appliquent telles quelles** sur MySQL 8 ou MariaDB local.

À prévoir : export des données existantes, import, puis `pnpm run db:push`. Et un `mysqldump` chiffré quotidien copié hors machine — une machine unique est un point unique de défaillance.

## 8. Résidus sans impact 🟢

| Élément | Action |
|---|---|
| `template.json` (~30 Ko) | Copie figée du template d'origine, jamais lue à l'exécution. Supprimer |
| `.project-config.json` | Fichier de configuration Manus **contenant les secrets en clair**. À supprimer avec la rotation des secrets (point 5 en suspens) |
| `client/public/__manus__/debug-collector.js` | Déjà exclu du build de production. Peut être supprimé du dépôt avec le plugin de dev |
| `vite-plugin-manus-runtime` (devDependency) | Utilisé uniquement en développement. Retirer une fois hors de Manus |
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | **Déclarés mais jamais importés.** Deviendront utiles avec MinIO ; sinon à supprimer |
| Commentaires « Manus » dans `sdk.ts`, `const.ts`, `shared/const.ts` | Cosmétique, à nettoyer avec les modules concernés |
| `loginMethod: "manus"` dans les fixtures de test | Sans effet |

---

## Variables d'environnement : avant / après

| Actuelle | Devient |
|---|---|
| `OAUTH_SERVER_URL` = `api.manus.im` | ❌ supprimée — remplacée par la config du nouveau fournisseur |
| `VITE_OAUTH_PORTAL_URL` = `manus.im` | ❌ supprimée |
| `VITE_APP_ID` / `OWNER_OPEN_ID` | ⚠️ conservées mais resémantisées (identifiant d'app local, identité du propriétaire) |
| `BUILT_IN_FORGE_API_URL` / `_KEY` | ❌ supprimées — remplacées par la config stockage (chemin disque ou MinIO) |
| `VITE_FRONTEND_FORGE_API_URL` / `_KEY` | ❌ supprimées — remplacées par `VITE_GOOGLE_MAPS_API_KEY` |
| `VITE_ANALYTICS_ENDPOINT` | ✅ conservée — pointe vers votre Umami |
| `DATABASE_URL` | ✅ conservée — pointe vers MySQL local |
| `JWT_SECRET` | ✅ conservée — **à régénérer** |
| `VITE_GOOGLE_MAP_ID` | 🆕 déjà supportée dans le code |
| `SESSION_COOKIE_SAMESITE` | 🆕 déjà supportée (échappatoire cross-site) |
| `VITE_APP_LOGO` / `VITE_APP_TITLE` | ❌ **déjà mortes** — plus référencées nulle part |

---

## Ordre d'exécution recommandé

1. **Rapatrier les 15 assets** — seule action avec une fenêtre de temps. À faire en premier, aujourd'hui si possible.
2. **Base MySQL locale** + migrations + import des données.
3. **Stockage** (disque ou MinIO) + décision sur le préfixe d'URL.
4. **Cartes** avec votre clé Google restreinte.
5. **Authentification** — le chantier long. À coupler avec la rotation du `JWT_SECRET`.
6. **Notification et analytics** — supprimer l'une, auto-héberger l'autre.
7. **Déploiement** : Caddy (TLS), systemd, sauvegardes, supervision sur `/healthz` (déjà en place).
8. **Nettoyage final** : `template.json`, `.project-config.json`, plugin de dev, dépendances AWS si inutilisées.

## Ce qui est déjà prêt pour Ubuntu

Pour mémoire, ces points ne demandent aucun travail supplémentaire :

- Météo via Open-Meteo en direct, sans clé ni intermédiaire.
- `trust proxy` configuré pour tourner derrière Caddy ou nginx.
- Cookie de session en `sameSite: lax`, adapté à un déploiement première-partie.
- Point `/healthz` avec vérification réelle de la base.
- Build de production purgé de tout l'outillage Manus.
- Service worker et manifest PWA fonctionnels.
- Scripts npm portables (`cross-env`).
- Budget mémoire estimé : ~6 Go utilisés sur vos 12 Go, marge confortable.
