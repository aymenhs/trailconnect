# Corrections du deuxième audit de bugs — 1er octobre 2026

Suite de l'audit du 27 septembre.

**État vérifié :** `tsc --noEmit` propre · **404 tests réussis sur 73 fichiers** (326 avant) · `pnpm run build` vert · `pnpm audit --prod` : aucune vulnérabilité connue.

## Critique

| # | Correctif | Fichiers |
|---|---|---|
| 1 | Une demande d'inscription (`bookings.request`) applique la même règle que `events.join`. Il n'est plus possible de demander une place sur une sortie privée, annulée, masquée ou passée, et donc plus possible d'ouvrir ainsi la fiche d'une sortie privée. Le matching ne propose plus que des sorties publiques et visibles | `server/hikingRouter.ts` (`assertJoinable`), `server/db.ts` |
| 2 | La page publique d'un organisateur ne liste plus ses sorties privées ni celles masquées par la modération | `server/db.ts` |

## Élevé

- **Logistique :** pour un visiteur, la fiche publique ne contient plus le point et les consignes de rendez-vous, le plan d'urgence, l'itinéraire, le plan B ni l'image du parcours. L'état du terrain et de l'accès reste visible.
- **Sorties terminées et rappels :** une nouvelle tâche planifiée, toutes les 15 minutes, s'occupe de deux choses (`server/outingLifecycle.ts`, route `/api/scheduled/outing-maintenance`, unités `deploy/trailconnect-maintenance.*`) :
  - elle passe au statut « terminée » les sorties dont la fin prévue, plus 3 h, est dépassée ;
  - elle envoie les rappels de départ (la veille, puis moins de 2 h avant), une seule fois chacun.

  Une sortie publique terminée reste lisible par tous.
- **Invitations :** les liens `/invite/<jeton>` mènent désormais à une page d'invitation. En l'acceptant, on devient ami avec la personne qui a invité. L'invitation survit à la connexion. Un lien partageable reste valable pour plusieurs personnes pendant 7 jours. Une invitation envoyée à une adresse précise ne sert qu'une fois.
- **Photos :** toute image envoyée perd ses métadonnées EXIF, XMP et texte (position GPS comprise) avant d'être stockée, côté serveur (`server/imageMetadata.ts`). Pour le JPEG, seule l'orientation est conservée. Un fichier dont le contenu ne correspond pas au type déclaré est refusé.
- **Dépendances :** `mysql2` passe en 3.24.4, et `qs` est forcé en 6.16.0.

## Moyen

- **Préférences de notification :** elles sont désormais respectées pour toutes les notifications (`shared/notificationPolicy.ts`). L'interrupteur des rappels de départ est affiché.
- **Discussion de sortie :** l'organisateur et les co-organisateurs sont prévenus des messages. Le lien ouvre la sortie, et il reste une seule notification non lue par discussion.
- **Demandes d'inscription :**
  - l'organisateur est prévenu de chaque nouvelle demande ;
  - une demande refusée ne peut plus être renvoyée ;
  - une demande acceptée n'est plus remise en attente ;
  - un co-organisateur peut aussi trancher.
- **Erreurs :** le texte d'une erreur SQL n'est plus jamais renvoyé au client. Seules les erreurs métier (`DomainError`) ont un message affiché. Ailleurs, le message est générique, à la fois dans les procédures et dans le formateur tRPC.
- **Noms de fichiers :** les espaces et les accents ne bloquent plus l'envoi (`shared/uploadFilename.ts`, utilisé à 7 endroits).
- **Messages privés :**
  - par défaut, seuls les amis et les personnes d'une même sortie peuvent écrire ;
  - un membre bloqué ne peut plus envoyer de demande d'ami.
- **Visibilité « amis » :** un profil réglé ainsi est maintenant visible des amis.
- **Navigateur :**
  - les copies hors ligne des sorties sont supprimées 2 jours après la sortie et à la déconnexion ;
  - les restes de Manus sont retirés : copie du nom et du courriel, et session lue dans `sessionStorage`.
- **Quota d'envoi :** les envois de fichiers par tRPC sont limités à 20 par minute.
- **Divers :**
  - la recherche ne renvoie plus de sorties passées ;
  - les co-organisateurs voient les participants, les pointages, les positions partagées et les demandes ;
  - le journal de modération vise la vraie cible d'un signalement ;
  - le nombre de sorties, les km et le dénivelé d'un profil sont calculés à partir des sorties terminées ;
  - l'effacement de compte supprime aussi les rôles de coordination, les traces de partage d'invitation et la note de retrait de covoiturage.

## Migration à lancer au déploiement

`drizzle/0053_reminders_and_message_privacy.sql` contient deux changements :
- le canal `in_app` des rappels ;
- la valeur par défaut `friends` des messages privés. Les lignes existantes gardent leur valeur.

Après le déploiement, installer et activer `trailconnect-maintenance.timer` (voir `deploy/README.md`).

## Tests

- **Nouveau banc de test :** `server/testing/recordingDb.ts` remplace le client mysql2. Il enregistre le SQL produit par drizzle, ce qui permet de tester les filtres et les écritures de `db.ts` sans base de données.
- **Couverture :** il couvre la visibilité, les invitations, les messages, le cycle de vie des sorties et, pour la première fois, `accountErasure.ts` : transaction, rollback, tables purgées, anonymisation.

## Non fait, et pourquoi

- **Badges (`userAchievements`) :** aucun mécanisme ne les attribue. C'est une fonctionnalité à concevoir, pas un correctif.
- **Fichiers orphelins :** les envois jamais rattachés à un contenu ne sont pas supprimés. Les supprimer exige d'inventorier toutes les colonnes qui référencent un fichier, et une erreur effacerait des fichiers utilisés.
- **Noms figés dans des notifications déjà envoyées :** ces textes ne sont pas réécrits lors d'un effacement.
- **Signalements :** ceux déposés par une personne effacée sont conservés, pour les besoins de la modération.
- **Pas de test contre un vrai MySQL :** Docker n'était pas démarré. Le banc vérifie le SQL produit, pas son exécution. La migration `0053` et l'effacement restent à valider sur une copie de la base.
- **Invitations aux sorties privées, découpage de `db.ts` et `Home.tsx`, `git init` :** toujours en suspens.
