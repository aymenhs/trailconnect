# Audit de production TrailConnect

**Date :** 1er septembre 2026
**Périmètre :** parcours utilisateur, complétude fonctionnelle, sécurité, conformité, design/accessibilité, dette technique, sortie de la dépendance Manus, mode hors ligne.
**État mesuré du dépôt :** `npx tsc --noEmit` sans erreur ; `npx vitest run` → **284 tests réussis sur 58 fichiers**. 19 621 lignes de source hors tests.
**Méthode :** lecture directe du code. Chaque constat porte une preuve `fichier:ligne`.

> **Correction d'une information périmée.** `DOCUMENTATION.md` annonce « 260 tests réussis et 13 échecs » et une erreur jsdom non gérée. C'est faux au 1er septembre 2026 : la suite est intégralement verte. Le passage correspondant de la documentation doit être mis à jour.

> **Articulation avec l'audit précédent.** `docs/audit-code-2026-09-01.md` a couvert cinq pistes et appliqué les correctifs S1–S6, D1–D3, F5 et T1. Le présent rapport ne les refait pas. Il traite ce qui n'a pas été couvert (navigation, parcours, complétude produit, conformité, migration) et signale ce qui reste ouvert.

---

## 1. Synthèse pour décision

### Verdict

**L'application n'est pas prête pour la production.** Le socle métier est solide et inhabituellement complet pour un projet généré : 797 lignes de routeur tRPC, 70 tables, une modélisation fine de la coordination de sortie (liste d'attente, covoiturage, checklist, Jour J, débrief, séries récurrentes). La qualité de conception métier n'est pas en cause.

Ce qui bloque relève de trois familles :

1. **Des impasses de parcours** — un utilisateur inscrit à une sortie ne peut pas s'en retirer, un membre ne peut pas quitter un groupe, le bouton Retour du navigateur éjecte de l'application.
2. **Des promesses non tenues** — le « mode hors ligne » n'existe pas, le paiement n'existe pas, alors que les deux sont exposés dans l'interface.
3. **Des blocages de mise en ligne** — secrets versionnés en clair, fuites de données sur sorties privées, aucune page légale, dépendance totale à l'infrastructure Manus.

### Blocages P0 — à traiter avant toute mise en ligne

| # | Blocage | Famille | Effort |
|---|---|---|---|
| P0-1 | Secrets de production versionnés en clair (`DATABASE_URL`, `JWT_SECRET`, clés Stripe, token Git) | Sécurité | XS + rotation |
| P0-2 | Fuite des sorties privées : 5 procédures publiques sans contrôle de visibilité (noms de participants, GPS des repères) | Sécurité | S |
| P0-3 | Contournement de modération : une sortie masquée/brouillon/annulée reste lisible par lien direct | Sécurité | XS |
| P0-4 | Impossible de se retirer d'une sortie, d'un groupe ou de retirer sa candidature | Parcours | M |
| P0-5 | Mode hors ligne inexistant alors qu'il est promis dans l'interface | Fonctionnel | L |
| P0-6 | Aucune page légale ni consentement, analytics chargé sans base légale (Loi 25 / LPRPDE) | Conformité | M |
| P0-7 | Dépendance totale à Manus pour auth, stockage, cartes, notifications, analytics et base | Infrastructure | L |
| P0-8 | Aucune limitation de débit, aucun en-tête de sécurité, corps de requête à 50 Mo | Sécurité | S |

### Effort global

| Lot | Contenu | Ordre de grandeur |
|---|---|---|
| Sécurité et conformité P0 | P0-1, P0-2, P0-3, P0-6, P0-8 | 1 à 2 semaines |
| Sortie de Manus + déploiement Ubuntu | P0-7 | 2 à 3 semaines |
| Parcours : routage URL + retraits volontaires | P0-4 et refonte navigation | 2 à 3 semaines |
| PWA hors ligne | P0-5 | 2 semaines |
| P1 avant ouverture publique | pagination, notifications email, partage, accessibilité des superpositions | 2 semaines |
| **Total avant ouverture publique** | | **9 à 12 semaines** |

La dette d'architecture (monolithes, i18n, tests) n'est pas bloquante et peut s'étaler après l'ouverture.

---

## 2. Parcours utilisateur

C'est le cœur de la demande : aucun écran sans retour, sans sortie, sans soumission ; aucun écran mort ; aucune information inutile. Le diagnostic est sévère sur les deux premiers points.

### 2.1 Le problème structurel : l'application n'a pas de routeur

[`client/src/App.tsx:16-24`](../client/src/App.tsx#L16-L24) ne déclare que quatre routes :

```
/                     → Home
/u/:slug              → PublicProfilePage
/organizers/:slug     → OrganizerProfilePage
*                     → NotFound
```

**Les neuf écrans principaux de l'application vivent tous dans `Home.tsx`**, sélectionnés par un état React :

```ts
// client/src/pages/Home.tsx:56
type View = "home" | "explore" | "my-outings" | "marketplace" | "create"
          | "community" | "profile" | "account" | "admin";
```

L'URL est bien mise à jour, mais avec `replaceState` ([`Home.tsx:508`](../client/src/pages/Home.tsx#L508)) :

```ts
useEffect(() => {
  const url = new URL(window.location.href);
  if (view === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}, [view]);
```

`replaceState` **écrase** l'entrée d'historique courante au lieu d'en empiler une nouvelle. Conséquence directe et vérifiable :

> Accueil → Explorer → Communauté → **Retour** ⇒ l'utilisateur **quitte TrailConnect**.

Sur Android, le bouton Retour matériel produit le même effet : sortie de l'application depuis n'importe quel écran. Sur iOS, le geste de retour arrière fait de même.

La fiche de sortie est la seule exception : elle utilise correctement `pushState` ([`Home.tsx:496`](../client/src/pages/Home.tsx#L496)) et gère `popstate`. C'est la preuve que le motif correct est compris par l'équipe — il n'a simplement pas été généralisé.

**Autres conséquences du non-routage :**

| Conséquence | Détail |
|---|---|
| Aucun lien partageable | Impossible d'envoyer « regarde ce groupe » ou « voici mon profil » ; seules les sorties (`?event=`) et les profils publics (`/u/:slug`) sont adressables |
| Rafraîchissement destructeur | F5 sur l'étape 3 de création ⇒ retour à l'étape 1 ; F5 sur l'onglet Historique ⇒ retour à l'onglet Profil |
| Analytics aveugle | Umami ne verra qu'une seule page vue ; aucun entonnoir de conversion mesurable |
| Pas de restauration d'état | Une notification push (future) ne pourra pas ouvrir un écran précis |

**Sous-navigations sans URL :**

- Étapes de création ([`CreateEventPage.tsx:96`](../client/src/pages/CreateEventPage.tsx#L96)) — `CreationSteps` pilote un entier local.
- Onglets de « Mon espace » ([`AccountProfilePage.tsx:44`](../client/src/pages/AccountProfilePage.tsx#L44)) — `useState<Tab>("profile")`.
- Onglets communauté ([`SocialCommunityPage.tsx:14`](../client/src/pages/SocialCommunityPage.tsx#L14)) — `type CommunityTab`.

**Recommandation.** Passer chaque vue à une route `wouter` réelle (`/explorer`, `/mes-sorties`, `/creer/:etape`, `/communaute/:onglet`, `/compte/:onglet`, `/admin`), la fiche de sortie en `/sorties/:id`. `wouter` est déjà présent et patché dans le projet. La bascule est mécanique : `setView(x)` devient `setLocation("/x")`, le `page` map devient un `<Switch>`. C'est le changement à plus fort effet de levier de tout cet audit : il résout d'un coup le retour navigateur, les liens partageables, le rafraîchissement et l'analytics.

### 2.2 Impasses : des actions qu'on ne peut pas annuler

Recensement exhaustif des mutations de [`server/hikingRouter.ts`](../server/hikingRouter.ts) : la liste comporte `join` pour les sorties **et** pour les groupes, mais **aucune procédure `leave`, nulle part**.

#### Un participant ne peut pas se retirer d'une sortie

Le seul chemin vers le statut `cancelled` est `manageParticipant` ([`hikingRouter.ts:693`](../server/hikingRouter.ts#L693)), qui appelle `manageEventParticipant` ([`db.ts:1306`](../server/db.ts#L1306)) :

```ts
export async function manageEventParticipant(actorId, input) {
  const { db, event } = await getEventManagementAccess(input.eventId, actorId);
  ...
}
```

`getEventManagementAccess` exige l'organisateur ou un coorganisateur. Un participant ne peut donc pas se désinscrire lui-même.

Côté interface, [`MyOutingsPage.tsx`](../client/src/pages/MyOutingsPage.tsx) ne consomme que `events.mine`, `events.departureReadiness`, `notifications.list`, `notifications.markRead`, `safety.checkIn` et `coOrganizers.respond` — **aucune action de retrait**.

> Un utilisateur qui s'inscrit par erreur, ou qui ne peut plus venir, n'a aucun moyen de se retirer. Il doit contacter l'organisateur hors application. Pour l'organisateur, cela signifie des places fantômes et un décompte faux jusqu'au départ.

#### Un membre ne peut pas quitter un groupe

`social.groups.join` existe ([`hikingRouter.ts:189`](../server/hikingRouter.ts#L189)). Aucune contrepartie : pas de `leave` dans le routeur, pas de `leaveCommunityGroup` dans [`db.ts`](../server/db.ts). Rejoindre un groupe est définitif du point de vue de l'utilisateur.

#### Un candidat ne peut pas retirer sa candidature

Sur une sortie en mode `request`, seule la procédure `decide` (organisateur) fait évoluer une demande. Un candidat en attente ne peut ni annuler ni revenir en arrière.

**Bonne nouvelle : le socle serveur est prêt.** `manageEventParticipant` gère déjà tout le travail difficile — passage à `cancelled`, retrait des offres de liste d'attente en attente, annulation des réservations de covoiturage et **libération des sièges** correspondants. Il manque uniquement :

1. Une procédure `events.leave` (protégée, sur soi-même) réutilisant cette logique.
2. Une procédure `social.groups.leave`.
3. Une procédure de retrait de candidature.
4. Les points d'entrée dans « Mes sorties », la fiche de sortie et la page du groupe, avec confirmation.

### 2.3 Écrans morts

#### MarketplacePage : une fonctionnalité complète, inaccessible

[`client/src/pages/MarketplacePage.tsx`](../client/src/pages/MarketplacePage.tsx) (16 Ko) implémente le matching de sorties, les préférences utilisateur (distance max, D+ max, niveaux, langues, disponibilités, préférence covoiturage) et la candidature comme guide avec soumission pour revue. C'est une fonctionnalité aboutie, adossée à de vraies procédures serveur (`marketplace.matches`, `marketplace.preferences`, `marketplace.guide`).

Elle est **totalement inaccessible depuis l'interface** :

- La vue `marketplace` existe dans le type `View` ([`Home.tsx:56`](../client/src/pages/Home.tsx#L56)) et dans le parseur d'URL initial ([`Home.tsx:463`](../client/src/pages/Home.tsx#L463)).
- Elle est absente de la barre latérale desktop, qui n'énumère que `["home", "explore", "my-outings", "create", "community", "profile"]` ([`Home.tsx:554`](../client/src/pages/Home.tsx#L554)).
- Elle est absente de `MobileNav`, qui n'énumère que `home`, `explore`, `create`, `my-outings`, `profile` ([`Home.tsx:611-617`](../client/src/pages/Home.tsx#L611-L617)).

Seul moyen d'y accéder : saisir `?view=marketplace` à la main dans la barre d'adresse.

> **Décision produit à prendre.** Soit le matching fait partie de la proposition de valeur et il faut lui donner une entrée de navigation, soit il n'en fait pas partie et il faut supprimer la page et ses procédures. L'état actuel — du code mort qui a l'air vivant — est le pire des trois.

Le libellé existe pourtant déjà dans le dictionnaire i18n : `nav.marketplace = "Matching"` ([`LocaleContext.tsx`](../client/src/contexts/LocaleContext.tsx)). L'intention était bien de l'exposer.

#### Autres écrans et code morts

| Élément | Taille | Nature |
|---|---|---|
| [`ComponentShowcase.tsx`](../client/src/pages/ComponentShowcase.tsx) | 60 Ko / 1 437 lignes | Galerie de composants, jamais routée (A5 de l'audit précédent, non traité) |
| [`ManusDialog.tsx`](../client/src/components/ManusDialog.tsx) | 2,4 Ko | Jamais importé |
| Bloc commenté dans `Home.tsx` | [lignes 567-607](../client/src/pages/Home.tsx#L567-L607) | `CreatePage`, `CommunityPage`, `ProfilePage`, `Field` — anciennes vues internes |
| `form`, `setForm`, `publishEvent`, `handleUpload`, `createEvent`, `trackUpload` dans `Home()` | ~30 lignes | [`Home.tsx:517`](../client/src/pages/Home.tsx#L517), [`:531`](../client/src/pages/Home.tsx#L531) — vestiges de la création avant `CreateEventPage` ; jamais rendus |
| `CarpoolActionHub` | [`Home.tsx:403`](../client/src/pages/Home.tsx#L403) | Remplacé par `ConfigurableCarpoolActionHub` ; contient un `window.prompt` |
| `TrailConnectPillars` | [`Home.tsx:417`](../client/src/pages/Home.tsx#L417) | Remplacé par `ActionableTrailConnectPillars` |
| `_core/llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `heartbeat.ts`, `dataApi.ts`, `map.ts` | ~41 Ko | Modules du template Manus, **aucun import dans le projet** |

**Volume total de code mort : environ 110 Ko**, soit près de 15 % de la base source.

### 2.4 Actions de sortie et de retour, écran par écran

| Écran / superposition | Retour visible | Échap | Retour navigateur | Verdict |
|---|---|---|---|---|
| Onglets principaux (9 vues) | Navigation latérale / barre mobile | — | ❌ quitte l'app | **À corriger** |
| Fiche de sortie ([`Home.tsx:286`](../client/src/pages/Home.tsx#L286)) | ✅ bouton persistant | ✅ [`Home.tsx:188`](../client/src/pages/Home.tsx#L188) | ✅ `pushState` | Conforme |
| Création de sortie | ✅ bouton Retour + onglets d'étape | — | ❌ | Partiellement conforme |
| Mon espace (onglets) | ✅ onglets | — | ❌ | Partiellement conforme |
| Administration | ✅ « Retour à l'application » | — | ❌ | Partiellement conforme |
| Gestion de groupe ([`GroupManagementPanel.tsx:25`](../client/src/components/GroupManagementPanel.tsx#L25)) | ✅ | ✅ ligne 9 | ❌ | Sémantique à corriger (§5) |
| Superposition communauté ([`SocialCommunityPage.tsx:141`](../client/src/pages/SocialCommunityPage.tsx#L141)) | ✅ `onClose` | ❌ | ❌ | Sémantique à corriger |
| Composer social ([`SocialCommunityPage.tsx:174`](../client/src/pages/SocialCommunityPage.tsx#L174)) | ✅ `onClose` + `role="dialog"` | — | ❌ | **Référence à généraliser** |
| Écran d'erreur global ([`ErrorBoundary.tsx`](../client/src/components/ErrorBoundary.tsx)) | ❌ « Reload Page » seulement | ❌ | ❌ | **Impasse — à corriger** |
| Marketplace | ❌ aucune entrée, aucune sortie | ❌ | ❌ | **Écran mort** |

> **Constat rectifié.** Le point F24 de l'audit précédent (« `AdminPage` largement non localisée ») est **obsolète** : la page est bilingue et dispose d'un bouton « Retour à l'application » en tête ([`AdminPage.tsx:32`](../client/src/pages/AdminPage.tsx#L32)). À retirer de la dette.

### 2.5 Informations inutiles ou fausses

| Constat | Preuve | Impact |
|---|---|---|
| Message de sécurité factuellement faux | `buildSafetyNotice({ hasWeatherSource: false, hasOfflinePack: false })` codé en dur ([`Home.tsx:455`](../client/src/pages/Home.tsx#L455)) | L'avertissement affiché ne reflète jamais l'état réel de la sortie. Sur un sujet de sécurité, c'est plus nuisible qu'une absence de message. (A8 de l'audit précédent, non traité) |
| Carte centrée sur San Francisco | `initialCenter = { lat: 37.7749, lng: -122.4194 }` ([`Map.tsx`](../client/src/components/Map.tsx)) | Défaut du template, incohérent pour un produit québécois |
| `mapId: "DEMO_MAP_ID"` | [`Map.tsx`](../client/src/components/Map.tsx) | Identifiant de démonstration Google ; à remplacer par un Map ID réel, sinon avertissements et limitations en production |
| Bloc de commentaire de template | [`client/index.html`](../client/index.html) | « THIS IS THE START OF A COMMENT BLOCK, BLOCK TO BE DELETED » livré en production |

---

## 3. Complétude fonctionnelle

Écart entre ce que `DOCUMENTATION.md` et l'interface promettent, et ce que le code fait.

### 3.1 Mode hors ligne — promesse non tenue (P0)

`DOCUMENTATION.md` annonce un « mode hors ligne » et un « Jour J accessible hors ligne ». L'interface propose « Sauvegardé hors ligne ».

**Réalité :**

- Aucun service worker. Aucun `navigator.serviceWorker` dans tout le client.
- Aucun manifest PWA. [`client/public/`](../client/public/) ne contient que `__manus__/` (outillage Manus).
- Aucun `<link rel="manifest">` dans [`index.html`](../client/index.html).
- [`shared/offline.ts`](../shared/offline.ts) écrit simplement du JSON dans `localStorage`.

> **Sans réseau, l'application ne se charge pas du tout.** Le « pack hors ligne » n'est lisible que si l'utilisateur a déjà la page ouverte et n'a pas rafraîchi.

Pour une application de randonnée — dont l'usage principal se situe précisément là où la couverture cellulaire disparaît — c'est l'écart le plus grave entre la promesse et l'implémentation. Un randonneur qui compte sur son plan d'urgence hors ligne et se retrouve devant un écran blanc au départ du sentier est exactement le scénario que l'application prétend éviter.

**Bug secondaire :** `saveOfflinePack` n'a pas de `try/catch` ([`shared/offline.ts`](../shared/offline.ts)) alors que `listOfflinePacks` en a un. Un quota `localStorage` dépassé lève une `QuotaExceededError` non capturée et fait tomber le composant.

**Défaut d'architecture :** `shared/offline.ts` est dans la couche partagée mais appelle `window.localStorage` — il n'est donc pas isomorphe et ne peut pas être utilisé côté serveur (A9 de l'audit précédent). Le plan §8 propose la séparation.

### 3.2 Paiement — annoncé, inexistant (P0 produit)

- `stripe@^22.5.0` est en dépendance de production.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `VITE_STRIPE_PUBLISHABLE_KEY` sont configurés.
- Le schéma porte `priceCents` et `currency: "CAD"` ([`drizzle/schema.ts`](../drizzle/schema.ts)).
- `CreateEventPage` collecte un prix ([`CreateEventPage.tsx:25`](../client/src/pages/CreateEventPage.tsx#L25)).

**Aucune ligne de code Stripe n'existe dans le projet.** Recherche exhaustive sur `server/`, `client/src/` et `shared/` : zéro occurrence hors `package.json` et configuration.

> Un organisateur peut aujourd'hui publier une sortie à 45 $ CAD. Un participant peut s'y inscrire. Aucun paiement n'a lieu, aucun encaissement, aucun remboursement en cas d'annulation. Impasse fonctionnelle complète.

**Recommandation immédiate :** retirer le champ prix de la création tant que le flux de paiement n'existe pas, ou le verrouiller à 0. Publier une sortie payante sans encaissement crée un risque commercial et juridique réel.

### 3.3 Notifications — in-app uniquement

Aucun envoi d'email (`nodemailer`, `resend` : absents), aucun push web. Le seul canal externe est `notifyOwner` ([`_core/notification.ts`](../server/_core/notification.ts)), qui notifie le propriétaire du projet via l'API Manus — pas les utilisateurs.

> Scénario réel : un organisateur annule sa sortie à 6 h du matin pour cause de météo. Les participants ne le sauront que s'ils ouvrent l'application. Certains partiront quand même.

Pour une application de coordination d'activités extérieures, un canal de notification hors application (email au minimum, push idéalement) n'est pas un confort mais une exigence de sécurité.

### 3.4 Découverte plafonnée

`listPublishedEvents` s'arrête à 40 résultats, `searchPublishedEvents` à 60 ([`db.ts`](../server/db.ts)). **Aucune pagination, aucun défilement infini, aucun « charger plus » nulle part dans l'application.**

Au-delà de 40 sorties publiées, une partie du catalogue devient invisible sans aucun signal à l'utilisateur. Le filtre de recherche est en outre appliqué **après** le `LIMIT` (D11 de l'audit précédent), ce qui rend les résultats incomplets de façon non déterministe.

### 3.5 Partage — sans aperçu

[`client/index.html`](../client/index.html) ne contient :
- ni `<meta name="description">`,
- ni balises Open Graph (`og:title`, `og:description`, `og:image`),
- ni Twitter Card,
- ni favicon,
- ni `apple-touch-icon`,
- ni `<link rel="manifest">`.

Partager le lien d'une sortie sur Messenger, WhatsApp ou Facebook produit un lien nu, sans titre, sans image, sans description. Pour un produit dont la croissance repose sur le partage social, c'est un handicap direct et peu coûteux à corriger.

`<html lang="fr">` est codé en dur, puis corrigé par JavaScript ([`Home.tsx`](../client/src/pages/Home.tsx), [`LocaleContext.tsx`](../client/src/contexts/LocaleContext.tsx)) — les moteurs d'indexation et les lecteurs d'écran voient d'abord la valeur statique.

### 3.6 Ce qui est complet et bien fait

Il faut le dire, car c'est substantiel :

- Cycle de vie complet d'une sortie : création en 4 étapes, candidature, validation, liste d'attente avec offre et délai de réponse, présence Jour J, débrief, séries récurrentes et relance.
- Covoiturage abouti : offre, réservation, décision du conducteur, retrait de passager, modification du trajet sans suppression, recalcul serveur des sièges.
- Météo : intégration Open-Meteo directe avec échantillonnage multi-points le long de la trace, formulations non prescriptives et honnêtes sur les limites du modèle.
- Difficulté : calcul multi-critères (distance, D+, durée, terrain, technicité, exposition, navigation, état du parcours) avec surcharge manuelle assumée.
- Modération : signalements catégorisés, actions administrateur tracées, statuts de compte.
- Bilinguisme FR/EN réellement présent partout dans l'interface.

---

## 4. Sécurité et conformité

### 4.1 P0-1 — Secrets de production versionnés en clair

[`.project-config.json`](../.project-config.json) contient, en texte clair, à la racine du dépôt :

| Secret | Nature du risque |
|---|---|
| `DATABASE_URL` | URL TiDB complète avec identifiant et mot de passe — **accès direct en lecture/écriture à la base de production** |
| `JWT_SECRET` | Clé de signature des sessions — permet de **forger une session pour n'importe quel compte, y compris administrateur** |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (test) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature des webhooks Stripe |
| `BUILT_IN_FORGE_API_KEY` | Clé de stockage serveur |
| `VITE_FRONTEND_FORGE_API_KEY` | Clé de proxy cartographique |
| `git_remote.token` | Jeton d'accès au dépôt Git distant |

Le fichier **n'est pas dans [`.gitignore`](../.gitignore)** — celui-ci ignore bien `.env` mais pas `.project-config.json`.

**Actions, dans cet ordre :**

1. **Faire tourner tous ces secrets sans attendre.** Ils doivent être considérés comme compromis dès lors que l'archive a circulé.
   - `JWT_SECRET` : régénérer (invalide toutes les sessions existantes — comportement souhaitable ici).
   - Mot de passe TiDB : changer, ou abandonner la base avec la migration vers MySQL local.
   - Clés Stripe : révoquer et régénérer depuis le tableau de bord Stripe.
   - Jeton Git : révoquer.
2. Ajouter `.project-config.json` à `.gitignore` ; charger la configuration depuis `.env` uniquement.
3. Si le dépôt a un historique Git, purger le fichier de l'historique (`git filter-repo`) — la simple suppression ne suffit pas.

### 4.2 P0-2 — Fuite de données sur les sorties privées

L'audit précédent a corrigé la visibilité sur `events.detail` (S1) et `marketplace.logistics.detail` (S6). **Cinq procédures sœurs ont été oubliées.** Toutes sont des `publicProcedure` acceptant un `eventId` arbitraire, sans aucun contrôle de visibilité ni côté routeur, ni côté base :

| Procédure | Routeur | Fonction DB | Données exposées |
|---|---|---|---|
| `events.actionAssignments` | [`:554`](../server/hikingRouter.ts#L554) | [`db.ts:367`](../server/db.ts#L367) | **Noms des participants** (`assigneeName` via jointure `users`) et leur rôle dans la sortie |
| `events.terrainLandmarks` | [`:624`](../server/hikingRouter.ts#L624) | [`db.ts:397`](../server/db.ts#L397) | **Coordonnées GPS** des points d'eau, abris et stationnements (`select()` complet) |
| `events.conditionReports` | [`:553`](../server/hikingRouter.ts#L553) | [`db.ts:514`](../server/db.ts#L514) | Comptes rendus terrain avec **nom de l'auteur** |
| `events.accessRadar` | [`:573`](../server/hikingRouter.ts#L573) | [`db.ts:828`](../server/db.ts#L828) | Statuts et notes d'accès, sources |
| `events.weatherUpdates` | [`:546`](../server/hikingRouter.ts#L546) | [`db.ts:470`](../server/db.ts#L470) | Bulletins météo avec **nom de l'auteur** |

Vérification sur `listEventActionAssignments` ([`db.ts:367`](../server/db.ts#L367)) :

```ts
export async function listEventActionAssignments(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ action: ..., assigneeName: users.name, ... })
    .from(eventActionAssignments)
    .leftJoin(users, eq(eventActionAssignments.assigneeId, users.id))
    .where(eq(eventActionAssignments.eventId, eventId));   // ← seul filtre
}
```

`eventIdSchema` valide seulement `z.number().int().positive()` ([`hikingValidation.ts:135`](../server/hikingValidation.ts#L135)). Les identifiants sont séquentiels (`autoincrement`).

**Exploitation :** un visiteur **non authentifié** énumérant `eventId = 1, 2, 3…` récupère, pour chaque sortie y compris privée et sur invitation, la liste nominative des participants et les coordonnées GPS précises des repères terrain.

**Correctif :** appliquer `canViewEventCoordination` — le contrôle **existe déjà** dans le projet, introduit par le correctif S2 — à ces cinq procédures, et les passer en `protectedProcedure`.

### 4.3 P0-3 — Contournement de la modération

`getEventDetail` ([`db.ts:261`](../server/db.ts#L261)) ne filtre ni `status` ni `moderationStatus` :

```ts
export async function getEventDetail(eventId: number) {
  const event = await getEventById(eventId);   // SELECT * WHERE id = ?
  if (!event) return undefined;
  ...
}
```

Alors que `listPublishedEvents` filtre correctement :

```ts
.where(and(eq(events.status, "published"),
           eq(events.moderationStatus, "visible"),
           eq(events.visibility, "public")))
```

Et `events.detail` ([`hikingRouter.ts:513`](../server/hikingRouter.ts#L513)) ne vérifie que `visibility`.

**Conséquence :** une sortie qu'un administrateur a masquée (`moderationStatus = "hidden"`) après signalement — contenu inapproprié, sortie dangereuse, fraude — **reste intégralement lisible** via `?event=<id>`. Le lien déjà diffusé continue de fonctionner. Il en va de même pour les brouillons et les sorties annulées.

L'action de modération est donc largement cosmétique : elle retire la sortie des listes mais pas de l'accès direct.

**Correctif :** dans `events.detail`, rejeter `status !== "published"` et `moderationStatus !== "visible"` pour quiconque n'est pas organisateur ou coorganisateur (un brouillon doit rester visible de son auteur).

### 4.4 P0-8 — Durcissement HTTP absent

| Constat | Preuve | Risque |
|---|---|---|
| Aucune limitation de débit | Aucun `express-rate-limit`, aucun middleware tRPC de quota | Messagerie, signalements, demandes d'amis et téléversements exploitables en masse ; énumération facilitée |
| Aucun en-tête de sécurité | `helmet` absent, aucune CSP | XSS, clickjacking, fuite de `Referer` |
| Corps de requête à 50 Mo | [`index.ts:33`](../server/_core/index.ts#L33) | Un anonyme peut poster 50 Mo sur `/api/trpc` ; les images arrivent en base64 en mémoire — déni de service par épuisement mémoire trivial |

(M3, L1, L3 de l'audit précédent, toujours ouverts.)

### 4.5 Sessions

| Constat | Preuve | Recommandation |
|---|---|---|
| JWT valide **un an** | `ONE_YEAR_MS` ([`shared/const.ts:2`](../shared/const.ts#L2)) | Durée courte avec renouvellement glissant |
| Aucune révocation | `logout` ne fait que `clearCookie` ([`routers.ts:11-16`](../server/routers.ts#L11-L16)) | Un jeton volé reste valide un an malgré la déconnexion. Ajouter un numéro de version de session en base, vérifié à chaque requête |
| `appId` non vérifié | `verifySession` extrait `appId` puis l'ignore ([`sdk.ts`](../server/_core/sdk.ts)) | Comparer à `ENV.appId` |
| `sameSite: "none"` | [`cookies.ts`](../server/_core/cookies.ts) | Passer à `"lax"` en déploiement autonome ; `none` n'était nécessaire que pour l'iframe de prévisualisation Manus |
| `logout` en `publicProcedure` | [`routers.ts:11`](../server/routers.ts#L11) | Combiné à `sameSite: none`, permet une déconnexion forcée depuis un site tiers. Nuisance, non critique |

### 4.6 Performance : écriture en base à chaque requête

`authenticateRequest` ([`sdk.ts`](../server/_core/sdk.ts)) exécute, **pour chaque appel tRPC** :

```ts
let user = await db.getUserByOpenId(sessionUserId);   // SELECT
...
await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });  // UPDATE
```

Un `SELECT` **et un `UPDATE`** sur `users` avant même que la procédure demandée ne s'exécute. Sur une machine unique de 12 Go, ce coût est multiplié par chaque requête de chaque utilisateur.

**Correctif :** ne mettre `lastSignedIn` à jour qu'au maximum une fois par tranche (par exemple 15 minutes), ou uniquement lors du rafraîchissement de session. Mettre en cache le lookup utilisateur pour la durée de la requête.

### 4.7 Panne de base silencieuse

```ts
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}
```

Toutes les fonctions appelantes font `if (!db) return []` ou `return undefined`. **Une panne MySQL se présente à l'utilisateur comme « aucune sortie disponible »**, pas comme une erreur. En production autonome, où l'on ne dispose pas d'un tableau de bord d'infrastructure, cette panne est indétectable côté utilisateur et trompeuse côté support.

**Correctif :** distinguer « base indisponible » de « aucun résultat ». Lever une erreur, exposer un `/healthz` réel (l'actuel `system.health` exige un `timestamp` en entrée et retourne `{ok:true}` sans vérifier quoi que ce soit).

### 4.8 Conformité — Loi 25 (Québec) et LPRPDE (P0-6)

L'application vise le Québec et collecte des renseignements personnels sensibles.

| Exigence | État |
|---|---|
| Politique de confidentialité | ❌ Aucune page, aucune route |
| Conditions d'utilisation | ❌ Aucune. `docs/terms-and-safety-draft.md` existe mais n'est branché nulle part |
| Mentions légales / responsable des renseignements personnels | ❌ Absent (obligation Loi 25) |
| Consentement avant dépôt de traceurs | ❌ Umami est chargé inconditionnellement ([`index.html`](../client/index.html)) |
| Information sur la finalité de la collecte | ❌ Absent |
| Droit d'accès et portabilité | ❌ Aucun export de données |
| Droit à l'effacement | ⚠️ Partiel — suppression de compte différée existe (`finalizeDueAccountDeletions`), mais l'anonymisation est incomplète (D10 de l'audit précédent) |
| Évaluation des facteurs relatifs à la vie privée | ❌ Absente |

**Aggravant :** les données collectées incluent la **position en temps réel** (`LocationSharingControls`), les **contacts d'urgence**, les **plans d'urgence** et des éléments de condition physique. Ce sont des renseignements personnels de sensibilité élevée. La Loi 25 impose un consentement distinct, explicite et éclairé pour chacun.

**Aggravant supplémentaire :** l'application publie des recommandations de difficulté et des avertissements de sécurité pour une activité où des accidents graves sont possibles. Les formulations du code sont prudentes et non prescriptives — c'est un point fort réel — mais **aucune limitation de responsabilité contractuelle n'est acceptée par l'utilisateur**, puisqu'il n'y a pas de CGU.

**Actions :**
1. Rédiger et router CGU, politique de confidentialité et mentions légales.
2. Acceptation explicite à la création de compte, horodatée et versionnée en base.
3. Bandeau de consentement conditionnant le chargement d'Umami. (Umami auto-hébergé sans cookie peut, selon la configuration, sortir du champ du consentement — à valider juridiquement.)
4. Consentements distincts pour position et contacts d'urgence. Le socle existe (`safety.consent`, `safety.saveConsent`) mais n'est pas relié à un texte.
5. Export de données au format machine dans « Mon espace ».
6. Compléter l'anonymisation à la suppression de compte.

### 4.9 Points vérifiés sains

À porter au crédit du projet, confirmés lors de cette passe :

- Aucun SQL brut construit avec de l'entrée utilisateur — Drizzle partout.
- Chaque entrée de procédure a un schéma Zod ; aucun `z.any()`.
- Toutes les procédures d'administration passent par `adminProcedure` ([`_core/trpc.ts`](../server/_core/trpc.ts)) ; le contrôle est serveur, pas seulement client.
- Le flux OAuth utilise un nonce à usage unique dans un cookie `__Host-` avec vérification côté callback ([`_core/oauth.ts`](../server/_core/oauth.ts)) — implémentation CSRF correcte et bien commentée.
- Un seul `dangerouslySetInnerHTML`, dans un composant `ui/chart.tsx` sans entrée utilisateur.
- `getEventManagementAccess` applique systématiquement le contrôle hôte/coorganisateur.
- Le téléversement de traces valide l'extension et le type (`/^[a-zA-Z0-9_.-]+\.(gpx|kml)$/i`) et exige un compte actif ([`index.ts:38-48`](../server/_core/index.ts#L38-L48)).
- Le nom de fichier de stockage reçoit un suffixe aléatoire ([`storage.ts`](../server/storage.ts)), ce qui atténue l'énumération sur le proxy non authentifié `/manus-storage/*` (L2).

---

## 5. Design et accessibilité

### 5.1 Écran d'erreur global — une impasse

[`ErrorBoundary.tsx`](../client/src/components/ErrorBoundary.tsx) affiche à l'utilisateur :

```tsx
<h2 className="text-xl mb-4">An unexpected error occurred.</h2>
<pre className="text-sm text-muted-foreground whitespace-break-spaces">
  {this.state.error?.stack}
</pre>
<button onClick={() => window.location.reload()}>Reload Page</button>
```

Quatre problèmes cumulés :

1. **La pile d'appel brute est affichée à l'utilisateur final** — divulgation de la structure interne, et incompréhensible.
2. **En anglais uniquement**, dans une application dont la langue par défaut est le français.
3. **Aucune sortie autre que « Recharger »** — pas de retour à l'accueil. Si l'erreur est déterministe, l'utilisateur boucle indéfiniment.
4. Aucune remontée d'erreur : rien n'est journalisé côté serveur, l'incident est invisible pour l'exploitant.

**Correctif :** message bilingue neutre, pile masquée derrière un `<details>` en développement uniquement, boutons « Réessayer » **et** « Retour à l'accueil », et envoi de l'erreur à un point de collecte serveur.

### 5.2 Dialogues natifs du navigateur

| Emplacement | Appel |
|---|---|
| [`Home.tsx:403`](../client/src/pages/Home.tsx#L403) | `window.prompt` — proposition de covoiturage (code mort, mais présent) |
| [`Home.tsx:443`](../client/src/pages/Home.tsx#L443) | `window.confirm` ×2 |
| [`Home.tsx:448`](../client/src/pages/Home.tsx#L448) | `window.confirm` — annulation de sortie |
| [`Home.tsx:454`](../client/src/pages/Home.tsx#L454) | `window.prompt` |
| [`GroupManagementPanel.tsx:25`](../client/src/components/GroupManagementPanel.tsx#L25) | `window.confirm` |
| [`AccountProfilePage.tsx:91`](../client/src/pages/AccountProfilePage.tsx#L91) | `window.confirm` — suppression de compte |

Ces dialogues ne sont ni stylables, ni traduits (ils suivent la langue du navigateur, pas celle de l'application), ni cohérents avec le reste de l'interface, et bloquent le fil d'exécution. Sur la **suppression de compte** — action irréversible — un `window.confirm` est particulièrement inadapté.

Le projet dispose déjà de `@radix-ui/react-alert-dialog` en dépendance et de composants `ui/alert-dialog`. Le remplacement est mécanique.

### 5.3 Sémantique des superpositions

| Superposition | `role="dialog"` | `aria-modal` | Piège de focus | Verrou de défilement | Échap |
|---|---|---|---|---|---|
| Fiche de sortie ([`Home.tsx:286`](../client/src/pages/Home.tsx#L286)) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gestion de groupe ([`GroupManagementPanel.tsx:25`](../client/src/components/GroupManagementPanel.tsx#L25)) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Communauté ([`SocialCommunityPage.tsx:141`](../client/src/pages/SocialCommunityPage.tsx#L141)) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Composer ([`SocialCommunityPage.tsx:174`](../client/src/pages/SocialCommunityPage.tsx#L174)) | ✅ | ✅ | ❌ | ❌ | ❌ |

Pour un utilisateur de lecteur d'écran, les trois premières ne sont pas annoncées comme des fenêtres modales : le focus reste libre de parcourir le contenu de fond, qui n'est ni masqué ni inerte. L'absence de verrou de défilement produit en outre le défaut mobile classique du fond qui défile sous la fenêtre.

Le composer (ligne 174) montre le motif correct **déjà présent dans le projet** — il suffit de le généraliser. (F14/F15 de l'audit précédent.)

### 5.4 Données personnelles écrites pendant le rendu

[`useAuth.ts:56-59`](../client/src/_core/hooks/useAuth.ts#L56-L59) :

```ts
const state = useMemo(() => {
  localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data));
  return { user: meQuery.data ?? null, ... };
}, [...]);
```

Deux problèmes :

1. **Effet de bord dans un `useMemo`.** React ne garantit ni le nombre ni le moment d'exécution d'un `useMemo` ; en mode strict il est exécuté deux fois. Un `useMemo` doit être pur. Quand `meQuery.data` est `undefined`, la chaîne `"undefined"` est écrite.
2. **PII en clair dans `localStorage`** — l'objet utilisateur complet inclut le nom et l'**adresse courriel**, persistés sans chiffrement, accessibles à tout script de la page et jamais purgés à la déconnexion (seul `sessionStorage.manus-cookie` l'est).

### 5.5 Éjection brutale vers l'authentification

[`main.tsx:14-24`](../client/src/main.tsx#L14-L24) : toute erreur `UNAUTHORIZED`, sur **n'importe quelle** requête, déclenche `startLogin()` — une navigation pleine page vers le portail OAuth.

Une session expirée pendant la rédaction d'une sortie éjecte l'utilisateur sans avertissement et sans possibilité d'annuler. Le brouillon local le sauve pour la création (clé `trailconnect-create-outing-draft`), mais pas pour un message, un signalement ou un compte rendu en cours.

**Correctif :** afficher une invite de reconnexion en fenêtre modale, préserver l'état, ne rediriger que sur action explicite.

### 5.6 Internationalisation

Environ **2 500 ternaires en ligne** (`locale === "fr" ? … : …` et `fr ? … : …`) dans les composants, contre un dictionnaire `LocaleContext` qui ne couvre qu'une fraction du texte.

| Conséquence | Détail |
|---|---|
| Maintenance | Changer une formulation impose de la retrouver dans un composant, pas dans un fichier de traduction |
| Poids | Les deux langues sont embarquées dans chaque composant et livrées à tous les utilisateurs |
| Extensibilité | Ajouter une troisième langue est hors de portée sans réécriture massive |
| Cohérence | Des variantes du même libellé coexistent (53 dictionnaires locaux recensés par l'audit précédent, A6) |

Non bloquant pour la mise en production, mais c'est la dette qui coûtera le plus cher à laisser grossir.

### 5.7 Qualité visuelle

Le système visuel est cohérent et soigné : palette verte définie, `min-h-11` respecté sur les cibles tactiles, `env(safe-area-inset-*)` géré, lien d'évitement présent ([`SkipToContentLink`](../client/src/pages/Home.tsx#L633)), `AccessibilityContext` dédié, attention réelle aux largeurs 320/375/390 px. C'est nettement au-dessus de la moyenne des interfaces générées.

Réserve : les couleurs sont écrites en hexadécimal littéral dans les classes Tailwind (`bg-[#f8fbf4]`, `text-[#1b392f]`…) plutôt qu'en jetons de thème. Cela rend impossible un mode sombre — alors que `ThemeProvider` est présent, avec l'option `switchable` commentée dans [`App.tsx:36-38`](../client/src/App.tsx#L36-L38). Pour une application utilisée avant l'aube au départ d'une randonnée, le mode sombre a une valeur d'usage réelle.

---

## 6. Technique et dette

### 6.1 Pile — validée

| Domaine | Choix | Verdict |
|---|---|---|
| UI | React 19.2 + Vite 7 + TypeScript 5.9 | À jour, pertinent |
| API | tRPC 11 + Zod 4 | Excellent choix : typage bout en bout, validation systématique |
| Données | Drizzle 0.45 + mysql2 | Solide ; 51 migrations sans dérive schéma |
| Styles | Tailwind 4 + Radix + shadcn | Standard, maintenable |
| État serveur | TanStack Query 5 | Approprié |
| Routage | wouter 3.3 (patché) | Adéquat — mais **inutilisé** (§2.1) |
| Tests | Vitest 2 + Testing Library | Bon ; 284 tests |
| Paquets | pnpm 10 | Verrouillé, reproductible |

**Aucun remplacement de brique n'est nécessaire.** Ajustements mineurs :

- `vitest` 2 → 3 (la 2 n'est plus maintenue).
- `@types/express` figé à `4.17.21` alors qu'`express` est en `^4.22.2`.
- Aucun champ `engines` dans [`package.json`](../package.json) — la documentation exige Node 22 mais rien ne l'impose.
- `recharts` (`charts-vendor`) est isolé dans un chunk : vérifier qu'il est réellement utilisé, sinon le retirer.

### 6.2 Monolithes

| Fichier | Lignes | Poids | Densité |
|---|---|---|---|
| [`server/db.ts`](../server/db.ts) | 2 248 | 180 Ko | ~205 fonctions exportées, 20 domaines |
| [`client/src/pages/Home.tsx`](../client/src/pages/Home.tsx) | **633** | **172 Ko** | **~272 caractères/ligne** |
| [`server/hikingRouter.ts`](../server/hikingRouter.ts) | 797 | 72 Ko | ~177 procédures |
| [`client/src/pages/CreateEventPage.tsx`](../client/src/pages/CreateEventPage.tsx) | **121** | **60 Ko** | **~496 caractères/ligne** |
| [`client/src/pages/SocialCommunityPage.tsx`](../client/src/pages/SocialCommunityPage.tsx) | **198** | 48 Ko | ~242 caractères/ligne |
| [`client/src/pages/AccountProfilePage.tsx`](../client/src/pages/AccountProfilePage.tsx) | **115** | 44 Ko | **~382 caractères/ligne** |

Le rapport lignes/poids révèle le problème réel : **le code est écrit en méga-lignes**. `CreateEventPage.tsx` fait 60 Ko en 121 lignes. Une ligne unique peut contenir un composant entier.

Conséquences concrètes :
- Les différences Git sont illisibles : modifier un mot déclare toute la ligne modifiée.
- La revue de code est impraticable.
- Les conflits de fusion sont ingérables.
- Les numéros de ligne des erreurs et des traces sont sans valeur diagnostique.

**Premier geste, à coût quasi nul :** un commit `prettier --write .` isolé, sans aucun changement de logique. `.prettierrc` et `.prettierignore` existent déjà, le script `format` est défini. Ce commit doit précéder tout autre refactor. (A3 de l'audit précédent.)

Ensuite seulement : découpage de `db.ts` par domaine derrière un baril, de `hikingRouter.ts` par sous-routeur (le type `AppRouter` reste inchangé, donc le client n'est pas impacté), et extraction de `Home.tsx` vers `components/event/`, `components/carpool/`, `components/preparation/`.

### 6.3 Code mort — environ 110 Ko

Récapitulatif (détail en §2.3) : `ComponentShowcase.tsx` (60 Ko), modules `_core` inutilisés du template (~41 Ko), `ManusDialog.tsx`, bloc commenté et variables mortes de `Home.tsx`, `CarpoolActionHub`, `TrailConnectPillars`. Suppression sans risque, à faire avant tout refactor.

Cas à part : `MarketplacePage.tsx` (16 Ko) est du code **vivant mais orphelin** — décision produit requise (§2.3).

### 6.4 Tests

**Points forts réels :** 284 tests, 58 fichiers, tous verts. Les tests d'interface sont comportementaux et couvrent de vrais parcours (« laisse un participant confirmé demander une place de covoiturage », « exige une confirmation de niveau explicite avant de rejoindre »). C'est de la bonne discipline.

**Lacunes :**

| # | Lacune | Gravité |
|---|---|---|
| 1 | **Aucune mesure de couverture.** `@vitest/coverage-v8` absent, aucun seuil | Haute |
| 2 | **Aucun test E2E.** Ni Playwright, ni Cypress. Aucun parcours réel navigateur validé | Haute |
| 3 | `db.ts` (~205 fonctions, toute la logique métier) **sans aucun test direct** ; le routeur ne vérifie que le câblage | Haute |
| 4 | Mocks tRPC recopiés à la main dans chaque fichier (~90 procédures) — dérivent du routeur réel. La panne `updateCarpool` déjà survenue se reproduira | Haute |
| 5 | Aucun polyfill jsdom central (`matchMedia`, `scrollTo`, observateurs) | Moyenne |
| 6 | Horloge réelle dans les tests — les fenêtres 48 h/72 h sont intestables | Faible |

(T2–T10 de l'audit précédent.)

**Priorité :** l'E2E est plus rentable que la couverture unitaire ici. Cinq parcours Playwright — s'inscrire, créer une sortie, candidater, accepter, se retirer — attraperaient exactement la classe de défauts identifiée dans cet audit (impasses, écrans morts, navigation).

---

## 7. Sortie de Manus vers l'Ubuntu personnelle

Cible : machine Ubuntu, i5, 12 Go RAM, 256 Go SSD. Google Maps peut rester un service externe.

### 7.1 Ce qui dépend réellement de Manus

L'inventaire est plus court qu'il n'y paraît, car **la majorité des modules du template sont morts** (§2.3).

| # | Dépendance | Fichiers | Remplacement | Effort |
|---|---|---|---|---|
| 1 | **Authentification** | [`_core/sdk.ts`](../server/_core/sdk.ts), [`_core/oauth.ts`](../server/_core/oauth.ts) | Auth propre. La session est déjà un JWT `jose` signé localement — seuls l'obtention de l'identité et `getUserInfoWithJwt` dépendent de Manus. Une couche courriel + lien magique, ou Google/Apple OAuth direct, remplace `OAuthService` en conservant `signSession`/`verifySession` | **M** |
| 2 | **Stockage** | [`storage.ts`](../server/storage.ts), [`_core/storageProxy.ts`](../server/_core/storageProxy.ts) | MinIO local (compatible S3, `@aws-sdk/client-s3` déjà présent) ou simple disque + service statique. L'interface `storagePut`/`storageGet`/`storageGetSignedUrl` est propre et se réimplémente à l'identique | **S** |
| 3 | **Cartes** | [`Map.tsx`](../client/src/components/Map.tsx) | Remplacer le proxy Forge par un chargement Google Maps direct avec **votre propre clé**, restreinte par référent HTTP. Corriger aussi `mapId` et le centre par défaut. Alternative sans coût : MapLibre + tuiles OSM | **S** |
| 4 | **Notifications** | [`_core/notification.ts`](../server/_core/notification.ts) | Seul `notifyOwner` l'utilise, via `systemRouter`. Supprimable, ou remplacé par l'envoi courriel du §3.3 | **XS** |
| 5 | **Analytics** | [`index.html`](../client/index.html) | Umami auto-hébergé sur la même machine (Docker, ~200 Mo). Aussi requis pour le consentement §4.8 | **S** |
| 6 | **Outillage de build** | [`vite.config.ts`](../vite.config.ts), `client/public/__manus__/` | Retirer `vite-plugin-manus-runtime`, `vitePluginManusDebugCollector`, `jsxLocPlugin` et `allowedHosts`. ⚠️ `debug-collector.js` (25 Ko, capture de console **et rejeu de session**) est **actuellement livré dans le build de production** (`dist/public/__manus__/`) — à supprimer en priorité | **S** |
| 7 | **Base** | `DATABASE_URL` TiDB | MySQL 8 ou MariaDB local. TiDB parle le protocole MySQL : les 51 migrations Drizzle s'appliquent telles quelles. Prévoir l'export des données existantes | **M** |

**Non concerné :** la météo appelle Open-Meteo directement ([`hikingRouter.ts:34-81`](../server/hikingRouter.ts#L34-L81)), sans clé et sans intermédiaire. Aucun verrou.

### 7.2 Architecture cible sur la machine

```
                    Internet
                       │
              ┌────────▼────────┐
              │  Caddy          │  TLS automatique (Let's Encrypt)
              │  reverse proxy  │  en-têtes de sécurité, limitation de débit
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌────▼─────┐
   │ Node 22   │ │  Umami    │ │  MinIO   │
   │ (systemd) │ │ (Docker)  │ │ (Docker) │
   │  1–2 Go   │ │  ~300 Mo  │ │  ~200 Mo │
   └─────┬─────┘ └─────┬─────┘ └──────────┘
         │             │
   ┌─────▼─────────────▼─────┐
   │      MySQL 8            │  ~2–3 Go (innodb_buffer_pool_size)
   └─────────────────────────┘
```

**Budget mémoire sur 12 Go :** Node 1–2 Go, MySQL 3 Go, MinIO 200 Mo, Umami 300 Mo, Caddy 50 Mo, système 1 Go → **environ 6 Go utilisés, 6 Go de marge**. Confortable. Le SSD de 256 Go est largement suffisant : la base restera de l'ordre du gigaoctet, le stockage média est le poste à surveiller (traces GPX négligeables, images de couverture à redimensionner à l'envoi).

**Ce qui manque entièrement et reste à créer** (aucune dette à défaire, la page est blanche) :

| Élément | Contenu |
|---|---|
| `Dockerfile` / `compose.yml` | Ou build natif + `systemd` — au choix |
| Unité systemd | `Restart=always`, `EnvironmentFile=/etc/trailconnect/env` en mode 600 |
| Configuration Caddy | TLS, en-têtes de sécurité, limitation de débit, compression |
| Sauvegardes | `mysqldump` quotidien chiffré + copie hors machine (une seule machine = point unique de défaillance) |
| Supervision | Point `/healthz` réel (§4.7), surveillance externe, alerte |
| Journalisation | `pino` en remplacement des `console.*`, rotation |
| CI | Aucune actuellement : `pnpm check && pnpm test && pnpm build` avant déploiement |
| `.env.example` | Documenter les variables sans jamais les valoriser |

**Point de vigilance :** `getSessionCookieOptions` fixe `sameSite: "none"` et `secure: isSecureRequest(req)` ([`cookies.ts`](../server/_core/cookies.ts)). Derrière Caddy, il faut faire confiance à `X-Forwarded-Proto` (`app.set("trust proxy", 1)`) sans quoi le cookie ne sera jamais marqué `secure`, et un cookie `SameSite=None` non `Secure` est **rejeté par tous les navigateurs modernes** — la connexion échouerait silencieusement. Passer à `sameSite: "lax"` règle le problème et améliore la posture CSRF.

### 7.3 Ordre de migration recommandé

1. **Rotation des secrets** (§4.1) — avant tout le reste.
2. Suppression du code mort et de l'outillage Manus de build ; commit Prettier.
3. MySQL local + application des migrations + import des données.
4. Stockage (MinIO ou disque) — interface déjà isolée.
5. Cartes avec clé propre.
6. Authentification — le morceau le plus long ; prévoir une bascule des comptes existants (`openId` Manus → nouvelle identité).
7. Caddy, systemd, sauvegardes, supervision.
8. Umami auto-hébergé, branché au consentement.

---

## 8. Plan PWA hors ligne

Objectif : qu'un randonneur ayant ouvert sa sortie chez lui puisse, **sans réseau au départ du sentier**, ouvrir l'application et consulter son dossier de sortie.

### 8.1 Fondations

**Manifest** (`client/public/manifest.webmanifest`) — nom, icônes 192/512 px et maskable, `display: "standalone"`, `theme_color: "#18362d"` (déjà dans `index.html`), `background_color`, `start_url: "/"`, `lang: "fr"`. Ajouter `<link rel="manifest">` et `apple-touch-icon` (§3.5).

**Service worker** — `vite-plugin-pwa` (Workbox) plutôt qu'un service worker manuel : génération du précache à partir du manifeste de build, gestion des mises à jour, et intégration directe à la configuration Vite existante.

### 8.2 Stratégies de cache

| Ressource | Stratégie | Justification |
|---|---|---|
| Coquille applicative (HTML, JS, CSS) | Précache + `StaleWhileRevalidate` | L'application doit démarrer sans réseau. C'est le point manquant aujourd'hui |
| Dossiers de sortie (`events.detail`, préparation, Jour J) | `NetworkFirst` avec repli cache, pour les sorties auxquelles l'utilisateur participe | Données fraîches si possible, disponibles sinon |
| Traces GPX/KML | `CacheFirst` sur téléchargement explicite | Immuables |
| Images de couverture | `CacheFirst`, plafond ~50 entrées | Confort |
| Tuiles de carte | **À traiter à part** | Les conditions d'utilisation de Google Maps **interdisent la mise en cache des tuiles**. Pour une carte hors ligne réelle, MapLibre + tuiles OSM/MBTiles est la voie ouverte. Sinon, l'alternative honnête est une **image statique du parcours** générée à l'enregistrement du pack (le champ `routeImageUrl` existe déjà dans `eventLogistics`) |
| Mutations | Aucune synchronisation différée en v1 | Voir §8.4 |

### 8.3 Réforme du pack hors ligne

`shared/offline.ts` doit être scindé (A9) :
- `shared/offline.ts` → construction pure de l'objet `OfflinePack`, isomorphe et testable.
- `client/src/lib/offlineStorage.ts` → persistance navigateur, avec `try/catch` sur `saveOfflinePack` (§3.1).

Migration de `localStorage` vers **IndexedDB** (via `idb`) : `localStorage` est synchrone, plafonné à ~5 Mo et bloque le fil principal. Un pack contenant une trace GPX et une image de parcours dépassera ce plafond.

Ajouter au pack : horodatage d'enregistrement **visible**, indicateur de fraîcheur et suppression manuelle. Un pack de trois semaines dont les points d'eau ont changé est dangereux s'il est présenté comme à jour.

### 8.4 Honnêteté d'interface — non négociable

L'application traite de sécurité en montagne. Le mode hors ligne doit énoncer ses limites :

- Bandeau explicite hors ligne : « Mode hors ligne — informations enregistrées le 28 août à 19 h 12. Météo et statuts d'accès non actualisés. »
- Distinguer visuellement les données figées des données vivantes.
- **Ne pas laisser croire à une synchronisation différée qui n'existe pas.** Si une action (pointage de sécurité, message) est impossible hors ligne, le dire, ne pas la laisser échouer en silence.
- Message clair au lieu d'un écran blanc quand une donnée non mise en cache est demandée hors ligne.

### 8.5 Séquence

1. Manifest + icônes + `vite-plugin-pwa`, précache de la coquille → **l'application démarre hors ligne**. C'est déjà l'essentiel du gain.
2. `NetworkFirst` sur les requêtes tRPC de mes sorties.
3. Migration IndexedDB + `try/catch` + fraîcheur visible.
4. Image statique du parcours dans le pack.
5. Indicateurs d'état hors ligne dans l'interface.
6. Invite d'installation sur l'écran d'accueil.

Étapes 1 à 3 ≈ une semaine, l'ensemble ≈ deux semaines.

---

## 9. Feuille de route priorisée

### P0 — avant toute mise en ligne

| # | Action | Fichiers | Effort |
|---|---|---|---|
| 1 | **Rotation de tous les secrets exposés**, `.project-config.json` dans `.gitignore`, purge de l'historique Git | [`.project-config.json`](../.project-config.json), [`.gitignore`](../.gitignore) | XS + rotation |
| 2 | Contrôle de visibilité sur les 5 procédures publiques (réutiliser `canViewEventCoordination`) | [`hikingRouter.ts:546`](../server/hikingRouter.ts#L546), [`:553`](../server/hikingRouter.ts#L553), [`:554`](../server/hikingRouter.ts#L554), [`:573`](../server/hikingRouter.ts#L573), [`:624`](../server/hikingRouter.ts#L624) | S |
| 3 | Filtrer `status` et `moderationStatus` dans `events.detail` | [`hikingRouter.ts:513`](../server/hikingRouter.ts#L513), [`db.ts:261`](../server/db.ts#L261) | XS |
| 4 | Retrait volontaire : `events.leave`, `groups.leave`, retrait de candidature + points d'entrée UI | [`hikingRouter.ts`](../server/hikingRouter.ts), [`db.ts:1306`](../server/db.ts#L1306), [`MyOutingsPage.tsx`](../client/src/pages/MyOutingsPage.tsx) | M |
| 5 | Retirer `debug-collector.js` du build de production | [`vite.config.ts`](../vite.config.ts), `client/public/__manus__/` | XS |
| 6 | `helmet` + CSP, limitation de débit, corps de requête à 10 Mo, `trust proxy`, `sameSite: "lax"` | [`_core/index.ts`](../server/_core/index.ts), [`_core/cookies.ts`](../server/_core/cookies.ts) | S |
| 7 | CGU, politique de confidentialité, mentions légales, acceptation horodatée, consentement analytics | Nouvelles routes, [`index.html`](../client/index.html) | M |
| 8 | Verrouiller le prix à 0 tant que Stripe n'est pas implémenté | [`CreateEventPage.tsx`](../client/src/pages/CreateEventPage.tsx), [`hikingValidation.ts`](../server/hikingValidation.ts) | XS |
| 9 | PWA : manifest + service worker + précache de la coquille | Nouveaux fichiers, [`vite.config.ts`](../vite.config.ts) | M |
| 10 | Migration hors Manus (auth, stockage, cartes, base, déploiement) | §7 | L |

### P1 — avant ouverture publique

| # | Action | Effort |
|---|---|---|
| 11 | **Routage URL réel** pour toutes les vues (`wouter` déjà présent) — résout retour navigateur, liens partageables, rafraîchissement, analytics | M |
| 12 | Décision sur Marketplace : exposer ou supprimer | XS ou S |
| 13 | Notifications courriel (annulation, acceptation, rappel J-1) | M |
| 14 | Pagination sur exploration et recherche ; filtre appliqué avant `LIMIT` | S |
| 15 | Open Graph, favicon, icônes, description | XS |
| 16 | Refonte de l'`ErrorBoundary` (bilingue, sans pile, avec retour à l'accueil, remontée serveur) | S |
| 17 | `role="dialog"` + `aria-modal` + piège de focus + verrou de défilement sur les 3 superpositions | S |
| 18 | Remplacer `window.confirm`/`prompt` par `AlertDialog` (Radix déjà présent) | S |
| 19 | Corriger `buildSafetyNotice` (valeurs réelles au lieu de `false` codés en dur) | XS |
| 20 | `authenticateRequest` : ne plus écrire en base à chaque requête | S |
| 21 | Panne de base non silencieuse + `/healthz` réel | S |
| 22 | `useAuth` : sortir l'écriture `localStorage` du `useMemo`, purger la PII à la déconnexion | XS |
| 23 | Transactions restantes (D4–D6) et index manquants (D7) | M |
| 24 | 5 parcours E2E Playwright | M |

### P2 — dette, après ouverture

| # | Action | Effort |
|---|---|---|
| 25 | Commit Prettier isolé sur les 36 fichiers en méga-lignes — **prérequis de tout ce qui suit** | XS |
| 26 | Supprimer les ~110 Ko de code mort | S |
| 27 | Découper `hikingRouter.ts` par sous-routeur (`AppRouter` inchangé) | M |
| 28 | Découper `db.ts` par domaine derrière un baril | L |
| 29 | Extraire `Home.tsx` en modules de composants | L |
| 30 | Migrer l'i18n vers un dictionnaire unique | L |
| 31 | Couverture de code avec seuils à cliquet ; fabrique de mocks tRPC par `Proxy` (T2) | M |
| 32 | Jetons de thème à la place des hexadécimaux littéraux ; activer le mode sombre | M |
| 33 | Résoudre les N+1 (`attachHostTrust`), clés étrangères, fuseaux horaires (D8–D10) | M |
| 34 | Décision Stripe : implémenter le paiement ou retirer la dépendance | L ou XS |

---

## Annexe — récapitulatif des constats

| Axe | P0 | P1 | P2 | Déjà corrigé (audit du 1er sept.) |
|---|---|---|---|---|
| Parcours utilisateur | 1 | 6 | 3 | 1 (F24 obsolète) |
| Complétude fonctionnelle | 3 | 3 | 1 | — |
| Sécurité | 4 | 4 | 2 | 6 (S1–S6) |
| Conformité | 1 | — | — | — |
| Design / accessibilité | — | 5 | 2 | 1 (F5) |
| Technique / données | 1 | 3 | 8 | 4 (D1–D3, T1) |
| **Total** | **10** | **21** | **16** | **12** |

### Les cinq constats à retenir

1. **Le bouton Retour du navigateur fait quitter l'application depuis n'importe quel écran** — `replaceState` au lieu de `pushState`, et aucun routeur. C'est le correctif à plus fort effet de levier de tout le rapport.
2. **On ne peut pas se retirer d'une sortie, quitter un groupe, ni annuler une candidature.** Le socle serveur est prêt ; il manque trois procédures et leurs points d'entrée.
3. **Cinq procédures publiques exposent les noms des participants et les coordonnées GPS des sorties privées** à un visiteur non authentifié. Le contrôle nécessaire existe déjà dans le code.
4. **Le mode hors ligne n'existe pas** alors qu'il est promis dans l'interface. Sans réseau, l'application ne démarre pas — dans une application de randonnée.
5. **Les secrets de production, dont la clé de signature des sessions et le mot de passe de la base, sont versionnés en clair.** Rotation à faire immédiatement, avant toute autre action.

---

*Audit réalisé par lecture directe du code au 1er septembre 2026. Plan de travail correspondant : [`2026-09-01-plan-audit-production.md`](./2026-09-01-plan-audit-production.md). Audit code antérieur : [`docs/audit-code-2026-09-01.md`](../docs/audit-code-2026-09-01.md).*
