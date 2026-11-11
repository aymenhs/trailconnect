# Audit approfondi du code — 1er septembre 2026

**Méthode :** cinq pistes d'audit indépendantes (sécurité, architecture, qualité frontend, couche de données, fiabilité des tests), chaque affirmation vérifiée par lecture du code.  
**État après corrections :** 284 tests réussis sur 58 fichiers, `tsc --noEmit` propre, build de production réussi.

## Corrections appliquées immédiatement (critiques et hautes)

| # | Problème | Gravité | Correctif |
|---|---|---|---|
| S1 | La visibilité « privé / sur invitation » des sorties n'était appliquée nulle part : listage, recherche et fiche étaient publics | Haute | Filtre `visibility = "public"` dans `listPublishedEvents` et `searchPublishedEvents` ; la fiche (`events.detail`) exige désormais l'organisateur, un coorganisateur, un participant ou un demandeur en attente pour une sortie non publique |
| S2 | IDOR : tout utilisateur connecté pouvait lire et écrire le chat de n'importe quelle sortie | Haute | Nouveau contrôle `canViewEventCoordination` (hôte, coorganisateur ou participant confirmé) sur `community.messages` et `community.sendMessage` |
| S3 | XSS stocké : `javascript:` accepté par `z.string().url()` dans les liens de profil, de groupe et de publication | Haute | Refine HTTPS obligatoire sur `socialLinkSchema.profileUrl`, `groupCreateSchema.websiteUrl`, `groupUpdateSchema.websiteUrl`, `groupPostCreateSchema.linkUrl` |
| S4 | `social.profile` ignorait `profileVisibility` et exposait les publications non publiques | Haute | La procédure retourne `null` pour un profil non public vu par un tiers (le propriétaire garde l'accès) ; les publications de profil sont filtrées à `visibility = "public"` |
| S5 | Pointage de sécurité (`safety.checkIn`) accepté pour n'importe quelle sortie sans participation | Moyenne | Exige l'organisateur ou un participant confirmé |
| S6 | `marketplace.logistics.detail` exposait rendez-vous, plans d'urgence et trajets à tout utilisateur connecté | Moyenne | Protégé par `canViewEventCoordination` |
| D1 | Course de capacité sur `events.join` : deux inscriptions simultanées pouvaient dépasser la capacité | Critique | `joinEvent` verrouille la sortie (`SELECT … FOR UPDATE`) et recompte dans une transaction ; en cas de saturation concurrente, le participant est basculé en liste d'attente avec notification |
| D2 | `decideBookingRequest` acceptait sans aucun contrôle de capacité | Critique | Vérification de capacité sous verrou dans la même transaction que l'acceptation ; refus clair lorsque la sortie est pleine |
| D3 | `getParticipantCount` lisait toutes les lignes puis filtrait en JS | Moyenne | `COUNT(*)` SQL direct |
| F5 | La publication d'une sortie échouait silencieusement (pas de `onError`) | Critique UX | Toast d'erreur ajouté à la mutation de création |
| T1 | Deux fichiers de test jamais exécutés (`shared/safety.test.ts`, `emptyStates.sweep.test.ts`) | Critique | Globs `shared/**/*.test.ts` et `client/**/*.test.ts` ajoutés à `vitest.config.ts` ; le balayage a immédiatement détecté une assertion de statut perdue (casse du motif corrigée) |

## Sécurité — constats restants

| # | Constat | Gravité | Recommandation |
|---|---|---|---|
| M3 | Aucune limitation de débit sur messagerie, signalements, demandes d'amis, uploads | Moyenne | `express-rate-limit` ou middleware tRPC par utilisateur sur les mutations sensibles |
| M4 | Cookie `SameSite=None`, JWT valide un an sans rotation ni révocation | Moyenne | `sameSite: "lax"`, expiration courte avec renouvellement glissant, version de session révocable |
| L1 | Body parser à 50 Mo alors que les payloads réels sont plafonnés à ~8 Mo | Faible | Réduire à ~10 Mo dans `server/_core/index.ts` |
| L2 | Le proxy `/manus-storage/*` sert toute clé sans authentification (atténué par le suffixe aléatoire) | Faible | Ne jamais y stocker de documents sensibles ; valider les octets magiques si besoin |
| L3 | Aucun en-tête de sécurité / CSP (`helmet` absent) | Faible | Ajouter `helmet` et une CSP, pertinent surtout avec les liens externes |
| L4 | La revendication `appId` du JWT n'est pas vérifiée | Faible | Vérifier `appId === ENV.appId` dans `verifySession` |
| L5 | `client/public/__manus__/debug-collector.js` livré en production | Faible | Exclure du build de production |

**Zones vérifiées saines :** aucun SQL brut avec entrée utilisateur ; chaque entrée de routeur a un schéma Zod (aucun `z.any()`) ; `getEventManagementAccess` applique systématiquement hôte/coorganisateur ; la messagerie directe applique blocages et préférences ; toutes les procédures admin passent par `adminProcedure` ; le flux OAuth utilise un nonce `__Host-` ; aucun secret codé en dur ; les 14 ancres `target="_blank"` portent `rel="noreferrer"`.

## Architecture et maintenabilité — constats restants

| # | Constat | Gravité | Effort |
|---|---|---|---|
| A1 | `server/db.ts` : 2 218 lignes, ~205 fonctions exportées (20 domaines identifiés) | Critique | L — extraction par domaine derrière un barrel, routeur et tests inchangés |
| A2 | `Home.tsx` : 633 lignes / 172 Ko, 74 déclarations (5 pages, ~20 panneaux, logique) | Critique | L — extraction en `components/event`, `components/carpool`, `components/preparation`… |
| A3 | 36 fichiers source en méga-lignes (> 2 000 caractères), diffs et revues illisibles | Critique processus | S — un commit Prettier dédié, sans changement logique |
| A4 | Covoiturage implémenté trois fois dans `Home.tsx` (dont `CarpoolActionHub` mort avec `window.prompt`) | Haute | S/M — un hook `useCarpoolLogistics` + un composant unique |
| A5 | `ComponentShowcase.tsx` (58 Ko) jamais routé ; `ManusDialog.tsx` inutilisé ; `BookingRequestsPanel.tsx` orphelin | Haute | S — suppression |
| A6 | 462 ternaires i18n en ligne et 53 dictionnaires locaux contournant `LocaleContext` | Haute | L — migration progressive vers le dictionnaire |
| A7 | `hikingRouter.ts` : ~177 procédures en un fichier | Haute | M — découpage par sous-routeur, type `AppRouter` inchangé |
| A8 | `buildSafetyNotice` reçoit `hasWeatherSource: false` et `hasOfflinePack: false` codés en dur — message incorrect | Moyenne (bug) | S — brancher les vraies valeurs |
| A9 | `shared/offline.ts` n'est pas isomorphe (`localStorage` dans la couche partagée) | Moyenne | S — séparer construction pure et stockage client |
| A10 | Formatage de dates réimplémenté dans 18 fichiers | Moyenne | S — `lib/format.ts` |

**Feuille de route recommandée :** (1) supprimer le code mort, (2) passe de formatage, (3) drapeaux de sécurité réels + split `offline.ts`, (4) helpers de format et covoiturage unifié, (5) split du routeur, (6) split de `db.ts`, (7) split de `Home.tsx`, (8) consolidation i18n.

## Frontend — constats restants

| # | Constat | Gravité |
|---|---|---|
| F6 | Mutations de sécurité sans `onError` (consentement, check-in) | Haute |
| F7 | Toutes les mutations de modération admin sans `onError` | Haute |
| F14/F15 | Trois overlays plein écran sans `role="dialog"` ni piège de focus (fiche sortie, gestion de groupe, composer) — le pattern Radix existe déjà dans le projet | Haute |
| F20 | Pas de découpage par route : `Home` (172 Ko) chargé statiquement dans `App.tsx` | Haute |
| F24 | `AdminPage` largement non localisée, dont du français affiché aux anglophones et un libellé utilisé comme clé logique | Haute |
| F8–F13 | Diverses mutations sociales/profil sans `onError`, états d'erreur/loading quasi absents | Moyenne |
| F1–F4 | Dépendances d'effets incomplètes, fermetures obsolètes mineures | Moyenne/Faible |
| F16–F19 | `role="switch"` sur un span, `window.prompt` covoiturage, boutons icône sans nom | Moyenne/Faible |
| F21–F23 | Absence de `React.memo` sur les cartes de liste ; code mort dans le chunk d'entrée | Moyenne/Faible |
| F25–F26 | Branches de locale mortes et chaînes codées en dur | Moyenne |

**Note positive :** aucune mutation d'état React directe trouvée ; les tris copient avant de trier ; les cibles tactiles `min-h-11` et le lien d'évitement sont cohérents.

## Couche de données — constats restants

| # | Constat | Gravité |
|---|---|---|
| D4 | Aucune transaction sur ~12 autres opérations multi-écritures (retrait covoiturage, annulation de sortie, publication depuis option de date, gestion de participant…) | Haute |
| D5 | Courses liste d'attente (`offerWaitlistedParticipant`, `acceptWaitlistOffer`) et décrément covoiturage non atomique (`decideCarpoolSeatReservation`) | Haute |
| D6 | Double publication possible depuis une option de date (garde non verrouillée) | Haute |
| D7 | Index manquants : `eventParticipants.userId`, `eventBookingRequests.hikerId`, `carpoolSeatReservations.passengerId`, `carpoolOffers.driverId` | Moyenne — migration requise |
| D8 | N+1 : `attachHostTrust` (jusqu'à ~480 requêtes/liste), médias par publication, conversations séquentielles | Moyenne |
| D9 | Colonnes métier en `DATETIME` naïf, fuseau de connexion non configuré — comparaisons correctes seulement si Node et MySQL sont en UTC | Moyenne |
| D10 | Aucune clé étrangère ; intégrité entièrement applicative ; suppression de groupe orpheline les messages ; annulation de sortie laisse offres et rappels actifs ; anonymisation de compte incomplète | Moyenne |
| D11 | Recherche texte appliquée après `LIMIT 60` ; colonne morte `eventMessages.ephemeralUntil` | Faible |

**Vérifié sain :** zéro dérive schéma ↔ migrations sur les 70 tables, colonnes et index (51 migrations).

## Fiabilité des tests — constats restants

| # | Constat | Gravité |
|---|---|---|
| T2 | Mocks tRPC complets par fichier (~90 procédures déclarées à la main) qui dérivent du routeur réel — la classe de panne `updateCarpool` se reproduira | Haute — fabrique `createTrpcMock` à base de `Proxy` recommandée |
| T3 | `server/db.ts` (~200 fonctions) sans aucun test direct ; le routeur ne vérifie que le câblage | Haute — extraire la logique pure vers `shared/` + palier d'intégration pour les 5 fonctions multi-écritures |
| T4 | Modules `shared/` non testés (`weatherComfort`, `types`, `_core`) | Moyenne |
| T5 | Assertions de détails d'implémentation (classes CSS, contenu brut de la feuille de style) | Moyenne |
| T6 | État mutable partagé restauré à la main dans `WeatherOutlook.alerts.test.tsx` (fuite entre tests si une assertion échoue) | Moyenne |
| T7 | Aucun polyfill jsdom central (`matchMedia`, `scrollTo`, observateurs) — mines pour `DashboardLayout`/`sidebar` | Moyenne |
| T8 | Aucune couverture de code ni E2E | Moyenne — `@vitest/coverage-v8` avec seuils à cliquet (55 % lignes initial, hors `db.ts`) |
| T9 | Horloge réelle dans les tests et dans `db.ts` (fenêtres 48 h/72 h intestables) | Faible |
| T10 | `toBeTruthy()` redondant après `getBy*` (~100 occurrences) | Faible |

## Synthèse

| Piste | Critique | Haute | Moyenne | Faible | Corrigés |
|---|---|---|---|---|---|
| Sécurité | 0 | 4 | 4 | 5 | 6 (S1–S6) |
| Données | 2 | 5 | 9 | 5 | 3 (D1–D3) |
| Frontend | 1 | 7 | 12 | 9 | 1 (F5) |
| Architecture | 3 | 4 | 3 | 0 | 0 (refactors planifiés) |
| Tests | 1 | 3 | 5 | 3 | 1 (T1) |

**Priorités suivantes recommandées :** M3 (limitation de débit), D4/D5 (transactions restantes), F14/F15 (sémantique de dialogue), A3 (formatage) puis la feuille de route de refactor A1/A2/A7.
