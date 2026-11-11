# Corrections de l'audit de bugs — 26 septembre 2026

Suite de l'audit du 23 septembre (bugs et améliorations).

**État vérifié :** `tsc --noEmit` propre · **326 tests réussis sur 62 fichiers** (était 304/307, 3 en échec) · `pnpm run build` vert.

## Critique

| # | Correctif | Fichiers |
|---|---|---|
| 1 | `events.join` n'accepte plus qu'une sortie publique, publiée, visible et à venir. Une sortie privée atteinte par son identifiant répond `NOT_FOUND`. L'organisateur ne peut plus s'inscrire à sa propre sortie | `server/eventJoinPolicy.ts`, `server/hikingRouter.ts` |
| 2 | Effacement réel du compte : retrait des sorties à venir, annulation des sorties organisées à venir, transfert (ou suppression) des groupes possédés, suppression des données personnelles et des contenus, anonymisation de `users` (nom, courriel, identité rendue irréconciliable), suppression des fichiers téléversés | `server/accountErasure.ts`, `server/storage.ts` |
| 3 | Messages privés et de groupe : on renvoie désormais les 200 plus **récents** (auparavant, les 200 plus anciens) | `server/db.ts` |

## Élevé

- **Covoiturage.**
  - Une offre exige d'être participant ou organisateur de la sortie.
  - Le nombre de places se calcule en places, et non en réservations.
  - Redemander une place déjà acceptée est refusé.
  - L'acceptation d'une place est atomique : mise à jour conditionnelle, dans une transaction.
  - Un conducteur qui quitte la sortie ou en est retiré voit ses offres retirées, et ses passagers sont prévenus. Les demandes en attente sont aussi annulées.
- **`join` idempotent :** un participant confirmé qui réessaie n'est plus rétrogradé.
- **Groupes :** un membre banni ne peut plus revenir, et un propriétaire ne peut plus se rétrograder en cliquant « rejoindre ». La suppression d'un groupe efface aussi ses messages.
- **Demandes d'inscription :** seule une demande encore `pending` peut être tranchée.
- **Météo :** le jour de la prévision est le jour **local** du lieu de départ, déduit du décalage renvoyé par Open-Meteo. Les appels passent par un cache de 30 minutes, et le code en double est supprimé (`server/weather.ts`). `weather.outlook` applique le même contrôle d'accès que les autres panneaux de la fiche.
- **Liste publique :** elle ne contient plus que les sorties à venir.
- **Liens des notifications :**
  - `/sorties/:id`, qui menait à une 404, est remplacé par `/?event=:id`.
  - `eventId=` est converti en `event=`, ce qui ouvre la fiche de la sortie (`client/src/lib/navigation.ts`).

## Moyen

- **Places :** l'acceptation d'une offre de liste d'attente, la gestion d'un participant par l'organisateur, les demandes d'inscription, le retrait et l'annulation se font sous verrou de ligne, dans des transactions. Confirmer une personne `pending` ne la compte plus deux fois.
- **Annulation d'une sortie :** seules les personnes encore inscrites sont prévenues. Les offres de liste d'attente, demandes en attente et offres de covoiturage sont fermées.
- **`social.profile` :** ne crée plus de profil pour un identifiant inexistant.
- **Messages privés :** l'historique reste lisible même si l'un des deux restreint ensuite ses messages.
- **Réactions :** choisir à nouveau la même réaction la retire.
- **Profil privé par défaut** (Loi 25, art. 9.1) : migration `0052`. Les profils existants gardent leur valeur actuelle.
- **Production :**
  - le port est strict ;
  - un échec au démarrage sort avec le code 1 ;
  - `/healthz`, `system.health` et le point d'entrée cron ne renvoient plus le message d'erreur MySQL.
- **Session :** 30 jours au lieu d'un an, avec renouvellement glissant (`sdk.renewSessionCookie`). Les anciens jetons sont remplacés à leur première utilisation.

## Performance

- **Requêtes N+1 supprimées :** boîte de réception (jusqu'à 160 requêtes ramenées à 3), médias du fil et du profil.
- **Cache :** les indicateurs de confiance des organisateurs sont mis en cache 60 s.
- **Préférences de messagerie :** `getMessagingPreferences` ne fait plus d'`INSERT` à chaque lecture.

## Tests

- **Nouveaux tests :**
  - `eventJoinPolicy.test.ts`, `weather.test.ts` ;
  - tests `join` et `weather.outlook` dans `hikingRouter.test.ts` ;
  - suppression de fichiers dans `storage.test.ts` ;
  - lien de notification dans `navigation.test.ts`.
- **`MyOutingsPage.test.tsx` :** `Date` est figée, car les données de test étaient devenues des sorties passées.

## Non fait, et pourquoi

- **Découpage de `db.ts` (7 000 lignes), `Home.tsx` et `hikingRouter.ts` :** trop risqué sans contrôle de version. Il faut d'abord faire `git init`.
- **Invitations aux sorties privées :** il n'existe aucun mécanisme pour rejoindre une sortie privée. La seule voie existante était la faille corrigée au point 1. Les sorties privées n'acceptent donc plus de nouveaux inscrits tant qu'un lien d'invitation (jeton) n'est pas développé.
- **Pas de test d'intégration contre MySQL :** les fonctions de `db.ts` et `accountErasure.ts` sont vérifiées par `tsc` uniquement, car aucune base de test n'est disponible. L'effacement de compte est à valider sur une copie de la base avant la mise en production.
