# Sortie de la dépendance Manus — réalisée

**Date :** 3 septembre 2026
Suite du [delta de migration](./2026-09-03-delta-migration-ubuntu.md).

**État vérifié :** `tsc --noEmit` propre · **307 tests sur 60 fichiers** (était 302/59) · `pnpm run build` vert.

**Vérification décisive :** aucune référence à `manus.im`, `manus.ai`, `manuscdn`, `manus-analytics`, `butterfly-effect` ou `forge` ne subsiste dans le code exécuté. Les deux occurrences restantes sont des commentaires (le mot anglais « forge », et une note d'historique).

---

## 1. Assets rapatriés ✅ *(l'action qui se périmait)*

Les 15 images vivaient dans le S3 de Manus. Elles ont été téléchargées **tant que l'accès Forge fonctionnait encore**, puis optimisées.

| | |
|---|---|
| Téléchargées | **15 / 15** |
| Poids d'origine | 14,05 Mo |
| Après ré-encodage WebP (largeur max 1600 px, q82) | **5,24 Mo** — 63 % de moins |
| Destination | `client/public/media/` |

Les suffixes de hachage (`_38eee418`) étaient les clés de cache-busting de Manus ; Vite empreinte les assets publics par contenu, donc les noms ont été normalisés (`trailconnect-hero.webp`).

**Effet de bord bienvenu :** servies localement, elles entrent dans le précache du service worker — elles sont désormais disponibles hors ligne.

> Un piège au passage : les clés de correspondance de `ResponsiveCoverImage` se terminaient par `_`, séparateur du hash Manus. Sans hash, plus aucune variante mobile/desktop ne correspondait. Corrigé, et couvert par les tests existants.

## 2. Authentification ✅

`api.manus.im` remplacé par **Google OAuth en direct**.

- `server/_core/sdk.ts` réécrit : `GoogleOAuthProvider` (échange de code + userinfo OIDC).
- **Ce qui a été conservé intact** : la session est un JWT `jose` signé localement, elle ne dépendait déjà de personne. `signSession` / `verifySession` sont inchangés, garde `appId` compris.
- **La redirection de login passe côté serveur** (`GET /api/oauth/login`). Elle était construite dans le navigateur, ce qui obligeait le bundle à porter l'URL du fournisseur et l'`appId`, et rendait `startLogin()` dangereux à appeler pendant un rendu (il posait le cookie nonce). Le client se réduit à `window.location.href = "/api/oauth/login"` : changer de fournisseur ne touche plus le front.
- Le garde CSRF (nonce à usage unique, cookie `__Host-`) est repris tel quel.
- Une adresse courriel non vérifiée par Google n'est pas retenue — elle ne doit pas servir au rattachement de compte.
- `openId` reste la colonne d'identité, désormais namespacée `google:<sub>`.

**Sessions cron.** Elles reposaient sur un `openId` préfixé `cron_` validé auprès de Manus. Remplacées par un secret partagé comparé en temps constant (`timingSafeEqual`), avec l'unité systemd et le timer fournis.

## 3. Stockage ✅

`server/storage.ts` réécrit sur disque local. L'interface publique (`storagePut` / `storageGet` / `storageGetSignedUrl`) est identique : **aucun appelant modifié**.

- `storageProxy` diffuse les fichiers en streaming au lieu de rediriger vers S3.
- Deux routes servies : `/uploads/*` (actuelle) et `/manus-storage/*` — car les lignes écrites du temps de Manus portent encore ce préfixe dans `coverImageUrl`, `gpxUrl`, `avatarUrl`… **Aucune migration de données n'est nécessaire.**
- La validation Zod accepte les deux préfixes (`isUploadedAssetUrl`), sinon modifier une sortie existante échouerait sur une image jamais touchée.
- Service worker mis à jour pour les deux.

**Traversée de répertoire.** La clé arrive d'une URL : `resolveStoragePath` refuse tout ce qui sort de `UPLOAD_DIR`. **5 tests dédiés**, dont `../../etc/passwd` et `users/../../../secret`.

## 4. Cartes ✅

Le proxy Forge exposait la clé Manus dans le bundle. Chargement direct depuis `maps.googleapis.com` avec `VITE_GOOGLE_MAPS_API_KEY`.

La clé est maintenant lue **paresseusement** plutôt qu'au niveau module : configurable à l'exécution, et testable sans dépendre de l'ordre des imports.

> Une clé navigateur est publique par nature. **C'est la restriction par référent HTTP qui la protège**, pas le secret. À configurer dans la console Google Cloud.

## 5. Notifications ✅

`server/_core/notification.ts` supprimé : dernier appelant de l'API Manus, il ne servait que le propriétaire du projet, jamais les utilisateurs. `system.notifyOwner` retiré.

`system.health` en profite : il prenait un `timestamp` qu'il ne regardait pas et répondait `{ok:true}` inconditionnellement. Il interroge maintenant réellement la base.

## 6. Nettoyage ✅

| Supprimé | Poids |
|---|---|
| `template.json` | ~30 Ko |
| `server/_core/types/manusTypes.ts` | — |
| `server/_core/notification.ts` | ~3 Ko |
| `client/public/__manus__/` (collecteur de debug) | 25 Ko |
| Plugin collecteur + helpers dans `vite.config.ts` | ~150 lignes |
| `.manus-logs/` | — |

**Dépendances retirées :** `vite-plugin-manus-runtime`, `@builder.io/vite-plugin-jsx-loc`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `axios`.

> Les deux paquets AWS étaient déclarés mais **jamais importés** — reliquat du template. À réintroduire si vous passez sur MinIO plus tard.

`allowedHosts` ne liste plus les domaines de prévisualisation Manus. `.project-config.json` est désormais dans `.gitignore` (il ne l'était pas), ainsi que `/var/`.

## 7. Déploiement — créé de zéro

Il n'existait aucun artefact de déploiement.

| Fichier | Contenu |
|---|---|
| `deploy/trailconnect.service` | Unité systemd, durcie (`ProtectSystem=strict`, `ReadWritePaths` limité aux uploads, `NoNewPrivileges`) |
| `deploy/trailconnect-deletions.{service,timer}` | Balayage quotidien des suppressions de compte |
| `deploy/Caddyfile` | TLS automatique, HSTS, compression |
| `deploy/README.md` | Procédure complète : MySQL, secrets, build, proxy, sauvegardes, supervision, reprise des données |
| `.env.example` | Toutes les variables documentées, aucune valeur réelle |

`server/_core/env.ts` réécrit : Forge remplacé par la configuration locale, et **échec au démarrage** si `JWT_SECRET` ou `DATABASE_URL` manquent en production — plutôt qu'un démarrage silencieux et cassé.

---

## Variables d'environnement

**Supprimées :** `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_APP_LOGO`, `VITE_APP_TITLE` (ces deux dernières étaient déjà mortes).

**Nouvelles :** `APP_URL`, `APP_ID`, `UPLOAD_DIR`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `VITE_GOOGLE_MAPS_API_KEY`.

**Conservées :** `DATABASE_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`, `VITE_ANALYTICS_*`, `VITE_GOOGLE_MAP_ID`, `SESSION_COOKIE_SAMESITE`.

---

## Ce qu'il vous reste à faire

Ces points demandent vos accès ou vos décisions, pas du code.

| # | Action | Où |
|---|---|---|
| 1 | **Créer l'identifiant OAuth Google** — URI de redirection exactement `${APP_URL}/api/oauth/callback` | Console Google Cloud |
| 2 | **Créer la clé Maps + le Map ID**, restreindre la clé par référent HTTP | Console Google Cloud |
| 3 | **Régénérer `JWT_SECRET`** (point 5 laissé en suspens). Cela déconnecte tout le monde — à faire **en même temps** que la bascule d'authentification, pas séparément | `/etc/trailconnect/env` |
| 4 | **Rattacher les comptes existants** : les `openId` Manus restent en base mais ne se reconnecteront pas. Procédure de rattachement par courriel dans `deploy/README.md` §Reprise | MySQL |
| 5 | **Copier les fichiers du stockage Forge** vers `UPLOAD_DIR` en conservant les clés, si des utilisateurs ont déjà téléversé. Les URL `/manus-storage/…` en base restent servies | serveur |
| 6 | Auto-héberger Umami, ou laisser `VITE_ANALYTICS_*` vide pour désactiver | Docker |
| 7 | Renseigner les `[À COMPLÉTER]` des pages légales, faire relire par un juriste | `client/src/pages/LegalPage.tsx` |

## Reste ouvert (hors périmètre migration)

Notifications courriel aux participants, paiement Stripe, découpage des monolithes, consolidation i18n, E2E Playwright, couverture de code. Détail dans l'[audit de production](./2026-09-01-audit-production.md).
