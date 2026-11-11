# Renommage `openId` → `externalId`

**Date :** 5 septembre 2026
**Déclencheur :** question de l'utilisateur sur le rôle réel de `openId` — le nom suggérait à tort le protocole OpenID Connect.

**État vérifié :** `tsc --noEmit` propre · **307 tests sur 60 fichiers** · `pnpm run build` vert.

## Pourquoi

`openId` était le nom que Manus donnait à sa colonne d'identité. Le nom n'a jamais désigné le protocole OpenID Connect — même avant la bascule vers Google, c'était déjà une confusion. Il l'est resté par inertie pendant la sortie de Manus car la colonne n'était référencée qu'à 5 endroits côté serveur.

Renommé en `externalId` : le nom décrit ce que c'est (l'identifiant de l'utilisateur chez le fournisseur d'identité), sans se confondre avec le protocole.

## Portée du changement

- **Schéma** — [drizzle/schema.ts](../drizzle/schema.ts) : colonne `openId` → `externalId`, avec sa contrainte d'unicité.
- **Migration** — [drizzle/0051_rename_openid_externalid.sql](../drizzle/0051_rename_openid_externalid.sql) : `RENAME COLUMN` / `RENAME INDEX`, pas de `DROP`+`ADD`. Un `RENAME` conserve les valeurs existantes ; un `DROP`+`ADD` généré automatiquement les aurait perdues.
- **Serveur** — `server/db.ts` (`getUserByOpenId` → `getUserByExternalId`, `upsertUser`), `server/_core/sdk.ts` (payload de session JWT, `ExternalIdentity`), `server/_core/oauth.ts`, `server/_core/env.ts` (`ownerOpenId` → `ownerExternalId`).
- **Variable d'environnement** — `OWNER_OPEN_ID` → `OWNER_EXTERNAL_ID`, dans `.env.example`, `docs/local-environment-template.env.example`, `DOCUMENTATION.md` et `deploy/README.md`.
- **Tests** — `server/hikingRouter.test.ts`, `server/auth.logout.test.ts`.

## Ce qui n'a pas changé

- Le contenu de la colonne : toujours `google:<sub>` pour les comptes créés depuis la bascule, et la valeur Manus d'origine pour les comptes plus anciens — le rattachement par courriel documenté dans `deploy/README.md` §Reprise reste identique, seul le nom de colonne dans la requête SQL a changé.
- `.project-config.json` — non touché. C'est le fichier de secrets en clair laissé en suspens (point 5 de l'audit de production), il n'est lu par aucun code ; y renommer `OWNER_OPEN_ID` n'aurait eu aucun effet et n'était pas dans le périmètre de cette passe.
- Les migrations SQL historiques (`0000_fuzzy_norrin_radd.sql`, etc.) — l'historique de migration n'est jamais réécrit, seule une nouvelle migration renomme la colonne.

## Si une base existe déjà

`pnpm run db:push` (ou l'exécution manuelle de `drizzle/0051_rename_openid_externalid.sql`) applique le renommage sans perte de données. Aucune autre action n'est requise : les valeurs de `externalId` sont identiques à celles qu'avait `openId`.
