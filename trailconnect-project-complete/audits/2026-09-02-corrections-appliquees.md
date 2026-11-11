# Corrections appliquées — 2 septembre 2026

Suite de l'[audit de production du 1er septembre](./2026-09-01-audit-production.md).

**Périmètre demandé :** tout sauf le constat n° 5 (secrets versionnés en clair), laissé en suspens à la demande de l'utilisateur.

**État final vérifié :** `tsc --noEmit` propre · **302 tests réussis sur 59 fichiers** (était 284/58) · `pnpm run build` vert.

---

## 1. Sécurité

| Constat | Correctif | Fichiers |
|---|---|---|
| **IDOR** — 5 procédures publiques exposaient noms de participants et GPS des sorties privées | Nouveau contrôle `canReadEventSheet` appliqué à `weatherUpdates`, `conditionReports`, `actionAssignments`, `accessRadar`, `terrainLandmarks`. Réponse `NOT_FOUND` (et non `FORBIDDEN`) : révéler qu'une sortie existe est déjà une divulgation | `server/db.ts`, `server/hikingRouter.ts` |
| **Contournement de modération** — sortie masquée/brouillon/annulée lisible par lien direct | `events.detail` rejette désormais `status !== "published"` ou `moderationStatus !== "visible"` pour qui n'est pas rattaché à la sortie (l'auteur garde l'accès à son brouillon) | `server/hikingRouter.ts` |
| Aucun en-tête de sécurité | `helmet` + CSP (appliquée en production seulement, Vite injectant des styles en ligne) | `server/_core/index.ts` |
| Aucune limitation de débit | 3 limiteurs : API 300/min, téléversements 20/min, OAuth 30/15 min | `server/_core/index.ts` |
| Corps de requête à 50 Mo | Ramené à 12 Mo (couvre les ~8 Mo réels) | `server/_core/index.ts` |
| Cookie `sameSite: "none"` | Passé à `"lax"`; échappatoire `SESSION_COOKIE_SAMESITE=none` qui force `secure` | `server/_core/cookies.ts` |
| `trust proxy` absent | Ajouté — sans lui, derrière Caddy le cookie n'aurait jamais eu son drapeau `secure` | `server/_core/index.ts` |
| Revendication `appId` lue mais ignorée | Vérifiée contre `ENV.appId` | `server/_core/sdk.ts` |
| `debug-collector.js` (console + rejeu de session) livré en production | Exclu du build ; tout l'outillage Manus retiré du bundle de production | `vite.config.ts` |

## 2. Impasses de parcours

| Constat | Correctif |
|---|---|
| **Impossible de se retirer d'une sortie** | `events.leave` + `db.leaveEvent` : statut `cancelled`, retrait des offres de liste d'attente, annulation des réservations de covoiturage **avec libération des sièges**, retrait de l'offre si la personne conduisait, notification à l'organisateur |
| **Impossible de retirer une candidature en attente** | Couvert par la même procédure |
| **Impossible de quitter un groupe** | `social.groups.leave` + `db.leaveCommunityGroup` (le propriétaire doit d'abord transmettre ou supprimer) |
| Points d'entrée manquants | Nouveau `LeaveOutingButton` dans « Mes sorties » et dans la fiche de sortie ; action « Quitter le groupe » dans le panneau de groupe. Confirmation par vrai dialogue, jamais proposée à l'organisateur sur sa propre sortie |

## 3. Navigation

- **Chaque écran a désormais une vraie URL** (`/explorer`, `/mes-sorties`, `/matching`, `/creer`, `/communaute`, `/profil`, `/compte`, `/admin`). Le bouton Retour du navigateur fonctionne, les liens sont partageables, F5 ne renvoie plus à l'accueil.
- Les anciens liens `?view=…` sont redirigés automatiquement (`legacyViewRedirect`).
- **Marketplace n'est plus un écran mort** : entrée ajoutée dans la navigation latérale.
- Nouveau module `client/src/lib/navigation.ts` + 8 tests dédiés.

## 4. Hors ligne (PWA)

- `vite-plugin-pwa` : manifest, icônes 192/512 + maskable, service worker (44 entrées préchargées).
- **L'application démarre maintenant sans réseau.** Coquille préchargée ; données de sortie en `NetworkFirst` (fraîches si réseau, lisibles sinon) ; médias et polices en `CacheFirst`.
- `OfflineStatusBar` : bandeau explicite hors ligne **datant les informations affichées** — sur un produit de randonnée, laisser croire que la météo est à jour est le mode de défaillance à éviter — et invite de mise à jour quand une nouvelle version est prête.
- `saveOfflinePack` ne lève plus sur quota dépassé ; retourne un booléen.
- Installation sur l'écran d'accueil possible.

## 5. Conformité (Loi 25 / LPRPDE)

- **Trois pages légales créées et routées** : `/conditions`, `/confidentialite`, `/mentions-legales`. Elles couvrent la nature du service (outil de coordination, pas d'encadrement), la responsabilité en montagne, les renseignements sensibles (position, contacts d'urgence), la conservation et les droits d'accès/suppression.
- **L'analytics ne se charge plus sans consentement** : script retiré de `index.html`, injecté seulement après un oui explicite. Bandeau où refuser coûte un clic, comme accepter. Consentement retirable depuis la politique de confidentialité, et le retrait supprime réellement le script et ses données.

> ⚠️ Les mentions `[À COMPLÉTER]` (raison sociale, adresse, courriel de contact, hébergeur) doivent être renseignées, et l'ensemble relu par un juriste, avant mise en ligne.

## 6. Design et accessibilité

| Constat | Correctif |
|---|---|
| Écran d'erreur affichant la pile brute, en anglais, sans issue | Réécrit : bilingue, pile réservée au développement, **bouton « Retour à l'accueil »** en plus de « Réessayer », erreur journalisée |
| 7 `window.confirm`/`window.prompt` | Tous remplacés. Nouveau hook `useConfirm` (Radix). Le `window.prompt` du covoiturage renvoie désormais vers le formulaire complet au lieu de publier un trajet sans horaire |
| Superpositions non annoncées comme modales | Nouveau hook `useModalOverlay` : `role="dialog"`, `aria-modal`, **piège de focus**, verrou de défilement, restitution du focus, Escape. Appliqué à la fiche de sortie, au panneau de groupe et au composer |
| PII écrite dans un `useMemo` | Déplacée dans un `useEffect`, et **purgée à la déconnexion** |
| Éjection brutale vers OAuth sur session expirée | Remplacée par une invite persistante « Se reconnecter » — le travail en cours n'est plus perdu |
| Message de sécurité factuellement faux | `hasWeatherSource` et `hasOfflinePack` étaient codés `false` : lus depuis l'état réel |
| Carte centrée sur San Francisco, `DEMO_MAP_ID` | Montréal par défaut ; `VITE_GOOGLE_MAP_ID` configurable |
| Partage sans aperçu | Open Graph, Twitter Card, description, favicon, icônes, carte sociale 1200×630 |

## 7. Fonctionnel et technique

- **Pagination** sur l'exploration et la recherche (`{ items, nextOffset }`, bouton « Afficher plus »). La découverte n'est plus plafonnée à 40 sorties.
- **Recherche texte corrigée** : le filtre s'appliquait **après** le `LIMIT`, ce qui faisait disparaître silencieusement des résultats. Il passe maintenant en SQL, avec échappement des jokers `LIKE`.
- **Prix verrouillé à 0** : Stripe est déclaré mais aucune ligne de code n'existe. Un organisateur pouvait publier une sortie à 45 $ sans encaissement possible. À rouvrir avec le paiement.
- **Panne de base non silencieuse** : `getDb()` lève au lieu de renvoyer `null` (ce qui affichait « aucune sortie » lors d'une panne). Nouveau point `/healthz` avec un vrai `SELECT 1`.
- **Écriture en base à chaque requête supprimée** : `lastSignedIn` n'est rafraîchi qu'une fois par 15 minutes au lieu d'un `UPDATE` avant chaque appel tRPC.
- `staleTime` de 30 s sur React Query (les remontages refetchaient systématiquement).
- **~110 Ko de code mort supprimés** : `ComponentShowcase`, `ManusDialog`, `CarpoolActionHub`, `TrailConnectPillars`, et 6 modules serveur du template Manus jamais importés.
- **Formatage Prettier** appliqué (item A3/P2-25) : `db.ts` 2 248 → 6 867 lignes, `Home.tsx` 633 → ~5 400. Les différences Git et les revues redeviennent lisibles.
- Scripts npm rendus portables via `cross-env` (`dev` était déjà cassé sous Windows).

## 8. Tests

+18 tests (284 → 302), dont : fermeture de la fuite sur les 5 panneaux, sortie masquée inaccessible par lien direct, retrait de sortie et de groupe (succès, refus, non authentifié), retrait proposé au participant mais **jamais à l'organisateur**, libellé adapté à une candidature en attente, et 8 tests de routage.

Les mocks tRPC écrits à la main ont dû être complétés à chaque nouvelle procédure — la fragilité **T2** signalée dans l'audit s'est manifestée trois fois pendant ce travail. La fabrique de mocks à base de `Proxy` reste recommandée.

---

## Ce qui reste ouvert

| # | Sujet | Raison |
|---|---|---|
| 1 | **Rotation des secrets** | Écarté à votre demande. `DATABASE_URL`, `JWT_SECRET`, clés Stripe et jeton Git restent en clair dans `.project-config.json`, hors `.gitignore`. **À traiter avant toute mise en ligne** |
| 2 | **Migration hors Manus** | Chantier d'infrastructure sur votre machine (auth, stockage, cartes, base) : dépend de vos clés, de vos choix d'authentification et d'un accès à la machine. Plan détaillé en §7 de l'audit |
| 3 | Notifications courriel / push | Nécessite un fournisseur d'envoi et un domaine vérifié |
| 4 | Paiement Stripe | Décision produit : implémenter, ou retirer la dépendance |
| 5 | Découpage des monolithes, consolidation i18n, E2E Playwright, couverture | Dette P2, non bloquante, à étaler après ouverture |
| 6 | Renseignement des `[À COMPLÉTER]` légaux + relecture juridique | Vous seul détenez ces informations |
