# Plan d'audit de production TrailConnect

**Date :** 1er septembre 2026
**Statut :** plan validé, à implémenter
**Portée :** production d'un rapport d'audit. Aucune modification de code applicatif dans cette passe.

## Contexte

TrailConnect (`hiking-social-app`) est une application web mobile-first React 19 / Express / tRPC / Drizzle-MySQL générée sous Manus, destinée à la coordination de randonnées de groupe au Québec. Le code est fonctionnellement riche (~177 procédures tRPC, 70 tables, 284 tests verts, `tsc --noEmit` propre) mais n'a jamais été audité sous l'angle **parcours utilisateur** ni sous l'angle **mise en production hors de Manus**.

La demande porte sur quatre axes : fluidité du parcours (aucun écran sans retour/sortie/soumission, aucun écran mort, aucune information inutile), complétude fonctionnelle par rapport aux attentes de ce type d'application, recherche de bugs (fonctionnels, sécurité, design, technique), et validation de la pile technique.

Décisions cadrantes :
- **Livrable = rapport d'audit uniquement.** Aucune modification de code dans cette passe.
- **Cible d'hébergement = machine Ubuntu personnelle** (i5, 12 Go RAM, 256 Go SSD). L'audit doit chiffrer la sortie de la dépendance Manus. Les SaaS externes réellement incontournables (Google Maps) restent acceptables.
- **Le mode hors ligne est traité comme bloquant P0**, avec plan PWA détaillé.

Un audit code antérieur existe (`docs/audit-code-2026-09-01.md`, 5 pistes, correctifs S1–S6/D1–D3/F5/T1 déjà appliqués). Le nouveau rapport ne le refait pas : il le référence, signale ce qui reste ouvert, et se concentre sur ce qu'il n'a pas couvert — navigation, parcours, complétude produit, conformité, et migration hors Manus.

## Constats déjà établis pendant l'exploration

Ces éléments sont vérifiés dans le code et constituent la matière du rapport. Ils ne sont pas à re-chercher.

### Navigation — le cœur du problème « écrans sans retour »

- [client/src/App.tsx:16-24](../client/src/App.tsx#L16-L24) ne déclare que 4 routes (`/`, `/u/:slug`, `/organizers/:slug`, 404). **Toute l'application vit dans `Home.tsx`**, pilotée par un `useState<View>` ([Home.tsx:56](../client/src/pages/Home.tsx#L56), [Home.tsx:461](../client/src/pages/Home.tsx#L461)).
- L'URL est synchronisée en `history.replaceState` ([Home.tsx:508](../client/src/pages/Home.tsx#L508)) : le bouton Retour du navigateur **ne revient jamais à l'onglet précédent**, il quitte l'application. Seule la fiche de sortie utilise `pushState` ([Home.tsx:496](../client/src/pages/Home.tsx#L496)).
- Les sous-navigations n'ont aucune URL : étapes de création ([CreateEventPage.tsx:96](../client/src/pages/CreateEventPage.tsx#L96)), onglets de « Mon espace » ([AccountProfilePage.tsx:44](../client/src/pages/AccountProfilePage.tsx#L44)), sections communauté. Un rafraîchissement ramène systématiquement à l'étape 1 / onglet 1.
- Conséquences à documenter : aucun lien partageable vers un profil, un groupe ou une étape ; aucun historique ; retour Android = sortie d'app ; impossibilité de mesurer les parcours en analytics.

### Écrans morts et code mort

- **`MarketplacePage.tsx` (16 Ko, fonctionnalité complète : matching, profil guide, préférences) est totalement inaccessible.** La vue `marketplace` existe dans le type `View` et dans le parseur d'URL initial ([Home.tsx:56](../client/src/pages/Home.tsx#L56), [Home.tsx:463](../client/src/pages/Home.tsx#L463)) mais n'apparaît ni dans la barre latérale ([Home.tsx:554](../client/src/pages/Home.tsx#L554)) ni dans `MobileNav` ([Home.tsx:611-617](../client/src/pages/Home.tsx#L611-L617)). Atteignable uniquement par `?view=marketplace` saisi à la main.
- Bloc commenté de 40 lignes contenant `CreatePage`, `CommunityPage`, `ProfilePage`, `Field` ([Home.tsx:567-607](../client/src/pages/Home.tsx#L567-L607)).
- Code mort actif dans `Home()` : `form`/`setForm`, `publishEvent` ([Home.tsx:531](../client/src/pages/Home.tsx#L531)), `handleUpload` ([Home.tsx:517](../client/src/pages/Home.tsx#L517)), `createEvent`, `trackUpload` — jamais rendus, la création passe par `CreateEventPage`.
- `CarpoolActionHub` ([Home.tsx:403](../client/src/pages/Home.tsx#L403), avec `window.prompt`) et `TrailConnectPillars` ([Home.tsx:417](../client/src/pages/Home.tsx#L417)) morts, remplacés par leurs variantes `Configurable*`/`Actionable*`.
- `ComponentShowcase.tsx` (58 Ko), `ManusDialog.tsx` : jamais routés (déjà A5 de l'audit précédent, non traité).
- Serveur : `_core/llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `heartbeat.ts`, `dataApi.ts`, `map.ts` — **aucun import**, résidus du template Manus (~40 Ko).

### Sécurité — constats nouveaux, non couverts par l'audit précédent

- **Secrets en clair versionnés** dans [.project-config.json](../.project-config.json) : `DATABASE_URL` TiDB avec mot de passe, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, clés Forge, token Git. Le fichier n'est pas dans [.gitignore](../.gitignore). **Rotation obligatoire de tous ces secrets** avant toute mise en production.
- **IDOR sur cinq procédures publiques sœurs de `events.detail`.** L'audit précédent a corrigé `events.detail` (S1) et `marketplace.logistics.detail` (S6) mais pas : `events.conditionReports` ([hikingRouter.ts:553](../server/hikingRouter.ts#L553)), `events.actionAssignments` ([:554](../server/hikingRouter.ts#L554)), `events.accessRadar` ([:573](../server/hikingRouter.ts#L573)), `events.terrainLandmarks` ([:624](../server/hikingRouter.ts#L624)), `events.weatherUpdates` ([:546](../server/hikingRouter.ts#L546)). Les fonctions DB correspondantes ne filtrent que sur `eventId` ([db.ts:367](../server/db.ts#L367), [:397](../server/db.ts#L397), [:514](../server/db.ts#L514), [:828](../server/db.ts#L828)). Un anonyme énumérant `eventId` récupère les **noms des participants** d'une sortie privée (`assigneeName`) et les **coordonnées GPS** des repères terrain (eau, abri, stationnement).
- **Contournement de modération.** `getEventDetail` ([db.ts:261](../server/db.ts#L261)) ne filtre ni `status` ni `moderationStatus`, contrairement à `listPublishedEvents`. Une sortie masquée par un administrateur, en brouillon ou annulée reste intégralement lisible via `?event=<id>`.
- Session JWT d'un an ([shared/const.ts:2](../shared/const.ts#L2)) sans rotation ni révocation ; `logout` ne fait que supprimer le cookie ([routers.ts:11-16](../server/routers.ts#L11-L16)) — un jeton volé reste valide un an. `verifySession` ne vérifie pas la revendication `appId` ([sdk.ts](../server/_core/sdk.ts)).
- `authenticateRequest` exécute une **écriture DB (`upsertUser` sur `lastSignedIn`) à chaque requête tRPC**, en plus d'un `getUserByOpenId` — coût direct sur la latence et la charge MySQL.
- Aucun rate limiting, aucun `helmet`, aucune CSP, `express.json({limit:"50mb"})` ([index.ts:33](../server/_core/index.ts#L33)) — repris de M3/L1/L3 de l'audit précédent, toujours ouverts.
- `getDb()` renvoie `null` silencieusement si la connexion échoue ([db.ts](../server/db.ts)) : une panne MySQL se présente à l'utilisateur comme « aucune sortie disponible » au lieu d'une erreur.

### Impasses de parcours — vérifié, constat majeur

Recensement exhaustif des mutations du routeur ([hikingRouter.ts](../server/hikingRouter.ts)) : la liste contient `join` pour les sorties comme pour les groupes, mais **aucune procédure `leave` nulle part**.

- **Un participant ne peut pas se retirer d'une sortie.** Aucune procédure de désinscription n'existe. `manageParticipant` ([hikingRouter.ts:693](../server/hikingRouter.ts#L693)) est la seule voie vers le statut `cancelled`, et `manageEventParticipant` ([db.ts:1306](../server/db.ts#L1306)) exige `getEventManagementAccess`, donc l'organisateur ou un coorganisateur. [MyOutingsPage.tsx](../client/src/pages/MyOutingsPage.tsx) ne consomme que `events.mine`, `departureReadiness`, `notifications.*`, `safety.checkIn` et `coOrganizers.respond` — aucune action de sortie. Une fois inscrit, l'utilisateur est enfermé et doit demander à l'organisateur de le retirer.
- **Un membre ne peut pas quitter un groupe communautaire.** `social.groups.join` existe ([hikingRouter.ts:189](../server/hikingRouter.ts#L189)), sans contrepartie ; aucun `leaveCommunityGroup` dans `db.ts`.
- **Un candidat ne peut pas retirer sa candidature en attente.** Seul `decide` (organisateur) fait évoluer une demande.

C'est l'illustration littérale de la demande — un écran d'où l'on ne peut ni sortir ni annuler son action. Le socle serveur est prêt (statut `cancelled`, notifications, libération des sièges de covoiturage dans `manageEventParticipant`) : il manque une procédure de retrait volontaire et son point d'entrée dans l'interface.

### Complétude fonctionnelle et informations inutiles

- **Mode hors ligne fictif.** Aucun service worker, aucun manifest PWA, `client/public/` ne contient que `__manus__/`. `shared/offline.ts` se contente d'écrire du JSON dans `localStorage` ; `saveOfflinePack` n'a pas de `try/catch` (échec sur quota). Sans réseau, l'application ne se charge pas du tout. Pour une application de randonnée, c'est un écart critique entre la promesse produit et l'implémentation.
- **Paiement inexistant.** `stripe` est en dépendance, `priceCents`/`currency` sont dans le schéma et dans le formulaire de création, mais **aucune ligne de code Stripe n'existe**. Un organisateur peut publier une sortie payante sans qu'aucun paiement ne soit possible : impasse fonctionnelle.
- **Notifications in-app uniquement** : aucun email, aucun push. Une annulation de sortie deux heures avant le départ n'atteint pas les participants hors application.
- **Aucune page légale** : ni CGU, ni politique de confidentialité, ni mentions légales, ni bandeau de consentement — alors que l'analytics Umami est chargé inconditionnellement ([client/index.html](../client/index.html)) et que l'application collecte position, contacts d'urgence et plan d'urgence. Enjeu Loi 25 (Québec) / LPRPDE. `docs/terms-and-safety-draft.md` existe mais n'est branché nulle part.
- **Aucune pagination.** `listPublishedEvents` plafonne à 40 résultats ([db.ts](../server/db.ts)), la recherche à 60. La découverte est structurellement bornée.
- **Métadonnées de partage absentes** : pas d'Open Graph, pas de Twitter Card, pas de favicon, pas d'icône d'application. Partager une sortie produit un lien nu. Bloc de commentaire de template non supprimé dans `index.html`.
- `buildSafetyNotice` appelé avec `hasWeatherSource: false` et `hasOfflinePack: false` codés en dur ([Home.tsx:455](../client/src/pages/Home.tsx#L455)) : le message de sécurité affiché est factuellement faux (A8 de l'audit précédent, non traité).

### Design, accessibilité, ergonomie

- Écran d'erreur global : **pile d'appel brute affichée à l'utilisateur**, en anglais uniquement, avec pour seule issue « Reload Page » — un écran sans sortie ([ErrorBoundary.tsx](../client/src/components/ErrorBoundary.tsx)).
- Dialogues natifs `window.prompt` / `window.confirm` dans le parcours covoiturage, groupes et suppression de compte ([Home.tsx:403](../client/src/pages/Home.tsx#L403), [:443](../client/src/pages/Home.tsx#L443), [:448](../client/src/pages/Home.tsx#L448), [GroupManagementPanel.tsx:25](../client/src/components/GroupManagementPanel.tsx#L25), [AccountProfilePage.tsx:91](../client/src/pages/AccountProfilePage.tsx#L91)) — non stylables, non traduits, non accessibles.
- Superpositions plein écran sans `role="dialog"`, sans `aria-modal`, sans piège de focus et sans verrouillage du défilement de fond : fiche de sortie ([Home.tsx:286](../client/src/pages/Home.tsx#L286)) et gestion de groupe ([GroupManagementPanel.tsx:25](../client/src/components/GroupManagementPanel.tsx#L25)). Le composer social ([SocialCommunityPage.tsx:174](../client/src/pages/SocialCommunityPage.tsx#L174)) le fait correctement — le motif correct existe donc déjà dans le projet.
- `useAuth` écrit l'objet utilisateur complet (dont l'email) dans `localStorage` **à l'intérieur d'un `useMemo`** ([useAuth.ts:56-59](../client/src/_core/hooks/useAuth.ts#L56-L59)) : effet de bord pendant le rendu, PII persistée en clair.
- Toute erreur `UNAUTHORIZED` déclenche une redirection immédiate vers le portail OAuth ([main.tsx:14-24](../client/src/main.tsx#L14-L24)) : éjection brutale hors de l'application, travail en cours perdu.
- i18n : ~2 500 ternaires `locale === "fr" ? … : …` en ligne contre un dictionnaire `LocaleContext` sous-utilisé. Les deux langues sont embarquées partout dans le bundle ; ajouter une troisième langue est hors de portée.
- Carte centrée par défaut sur San Francisco et `mapId: "DEMO_MAP_ID"` ([Map.tsx](../client/src/components/Map.tsx)).

### Pile technique et migration hors Manus

Pile globalement moderne et cohérente : React 19.2, Vite 7, TypeScript 5.9, tRPC 11, Drizzle 0.45, Zod 4, Tailwind 4, Vitest 2, pnpm 10. Rien à remplacer sur le fond. Points à traiter : Vitest 2 → 3, `@types/express` 4.17 figé face à Express 4.22, absence de `engines`, absence de configuration de couverture, absence d'E2E.

Dépendances Manus réelles à remplacer pour l'auto-hébergement (le reste du template est mort et supprimable) :
1. **Auth** — `_core/sdk.ts` + `_core/oauth.ts` (Manus OAuth)
2. **Stockage** — `storage.ts` + `_core/storageProxy.ts` (Forge presign → S3)
3. **Cartes** — proxy Forge dans `Map.tsx` avec `VITE_FRONTEND_FORGE_API_KEY` exposée côté navigateur
4. **Notifications** — `_core/notification.ts` (`notifyOwner`)
5. **Analytics** — Umami hébergé par Manus
6. **Outillage** — `vite-plugin-manus-runtime`, `debug-collector.js` (25 Ko, capture console + rejeu de session, **livré dans le build de production** `dist/public/__manus__/`)
7. **Base** — TiDB Cloud (protocole MySQL, donc migration directe vers MySQL/MariaDB local)

Bonne nouvelle à souligner : la météo passe déjà par Open-Meteo en direct (aucun verrou), et aucun artefact de déploiement n'existe (ni Dockerfile, ni CI, ni unité systemd, ni reverse proxy) — la cible est donc à construire de zéro, sans dette à défaire.

## Travail à réaliser

### 1. Vérifications complémentaires — faites

- Retrait volontaire : **absent** pour les sorties, les groupes et les candidatures (détaillé ci-dessus). Constat majeur ajouté au rapport.
- [AdminPage.tsx](../client/src/pages/AdminPage.tsx) : **le constat F24 de l'audit précédent est obsolète.** La page est bien bilingue et dispose d'un bouton « Retour à l'application » en tête. Le rapport le signalera comme corrigé plutôt que comme dette.
- Reste à balayer pendant la rédaction : [SocialCommunityPage.tsx](../client/src/pages/SocialCommunityPage.tsx) (46 Ko) pour recenser les panneaux sans action de sortie visible.

### 2. Rédiger le rapport

Rapport unique, en français, structuré ainsi :

1. **Synthèse pour décision** — verdict de mise en production, tableau des blocages P0, effort global estimé.
2. **Parcours utilisateur** — cartographie de la navigation réelle, le problème structurel du `replaceState`, les impasses de parcours (retrait impossible d'une sortie, d'un groupe, d'une candidature), inventaire écran par écran des retours/sorties/soumissions manquants, écrans morts, informations inutiles.
3. **Complétude fonctionnelle** — écart entre la promesse produit (documentée dans `DOCUMENTATION.md`) et l'implémentation : hors ligne, paiement, notifications, pagination, partage.
4. **Sécurité et conformité** — les constats nouveaux ci-dessus, plus le rappel des constats de `docs/audit-code-2026-09-01.md` restés ouverts (M3, M4, L1–L5, D4–D6), plus le volet Loi 25/LPRPDE.
5. **Design et accessibilité** — dialogues natifs, sémantique des superpositions, écran d'erreur, i18n, cohérence visuelle.
6. **Technique et dette** — pile validée, code mort chiffré, monolithes (`db.ts` 182 Ko, `Home.tsx` 172 Ko, `hikingRouter.ts` 71 Ko), tests (284 verts, mais aucune couverture mesurée, aucun E2E, `db.ts` non testé directement).
7. **Plan de sortie de Manus vers l'Ubuntu personnelle** — remplacement service par service (auth, stockage, cartes, notifications, analytics, base), architecture cible sur la machine (Node + MySQL + reverse proxy + Umami auto-hébergé, dimensionnement pour 12 Go de RAM), sauvegardes, TLS, supervision, procédure de rotation des secrets exposés.
8. **Plan PWA hors ligne** — manifest, service worker, stratégie de cache (coquille applicative + dossiers de sortie + tuiles de carte), installation sur l'écran d'accueil, limites honnêtes à afficher à l'utilisateur.
9. **Feuille de route priorisée** — P0 avant production / P1 avant ouverture publique / P2 dette, chaque élément avec effort et fichiers concernés.

Chaque constat porte une gravité, une preuve `fichier:ligne`, un impact utilisateur concret et une recommandation. Les constats déjà corrigés par l'audit précédent sont explicitement marqués comme tels pour éviter le double travail.

### 3. Publier

Écrire le rapport dans `audits/2026-09-01-audit-production.md` pour qu'il vive avec le projet. Une version HTML autonome (lisible sur mobile, thème clair/sombre) peut être générée en complément pour partage.

## Vérification

Le rapport est correct si :
- Chaque affirmation renvoie à un `fichier:ligne` vérifiable dans le dépôt.
- Aucun constat ne contredit `docs/audit-code-2026-09-01.md` sans le dire explicitement.
- Les quatre affirmations les plus lourdes sont re-vérifiées avant publication : inaccessibilité de `MarketplacePage`, absence de contrôle de visibilité sur les cinq procédures publiques, absence de service worker, absence de toute procédure de retrait volontaire.
- L'état de la suite est re-mesuré et rapporté tel quel : au 1er septembre 2026, `npx tsc --noEmit` ne produit aucune sortie et `npx vitest run` donne **284 tests réussis sur 58 fichiers** — la `DOCUMENTATION.md` annonce encore 13 échecs, information périmée à corriger dans le rapport.

Aucun code applicatif n'est modifié dans cette passe.