# Audit fonctionnel — collaboration TrailConnect

**Périmètre audité :** identifiants publics, invitations, droits de délégation, gestion de sorties et communautés, relations d’amitié, notifications et suppression différée de profil.

**Contrôles techniques exécutés :** TypeScript sans erreur, suite Vitest complète (**68 tests**) et build de production Vite/esbuild réussis au dernier passage de contrôle.

| Exigence | État | Contrôles réalisés | Correction / comportement final |
| --- | --- | --- | --- |
| Identifiant public partageable | Conforme | Résolution publique, confidentialité du profil et page `/u/{identifiant}` | QR code, copie, partage système, WhatsApp et SMS ; les profils privés ne sont pas exposés. |
| Demande d’amitié non automatique | Conforme | Procédures `requestBySlug`, réponse et retrait ; interface Compte | La demande reste `pending` jusqu’à une acceptation ou un refus par le destinataire. |
| Gestion des amis | Conforme | Boîte de réception Compte | Acceptation, refus, annulation d’une demande envoyée, retrait symétrique et blocage sont accessibles. |
| Invitation de coorganisateur | Conforme | Contrats tRPC, liste reçue, liste envoyée, UI et test de révocation | Seul l’organisateur principal invite/révoque ; le destinataire accepte ou refuse ; une invitation devient invalide si la sortie est annulée, terminée ou expirée. |
| Droits de coorganisateur | Conforme | Règles de persistance et rôle exposé dans la fiche | Un coorganisateur accepté modifie les essentiels ; il ne peut ni annuler la sortie ni déléguer l’organisation. |
| Modification / annulation de sortie | Conforme | Procédures protégées, formulaire organisateur et annulation confirmée | Seul l’organisateur principal annule. L’annulation annule les participations, invalide les invitations en attente et informe les participants. |
| Invitation de coadministrateur | Conforme | Contrats, validation de ressource, boîte de réception et formulaire propriétaire | Invitation par identifiant public, acceptation/refus explicite, expiration et état invalide si la communauté n’est plus disponible. |
| Gestion de communauté | Conforme dans le périmètre demandé | Gestion communautaire existante et contrôles de rôle | Le propriétaire gère les administrateurs et reste seul autorisé à supprimer ; les communautés ont un nom unique et des paramètres de visibilité. |
| Notifications d’invitation | Conforme | Création de notifications pour amitié, coorganisation, coadministration et annulation | Chaque notification présente un bouton « Ouvrir » qui redirige vers le centre Compte ou Mes sorties, où la décision est disponible. |
| Suppression réversible de profil | Conforme | Migration, procédures, interface, cron journalier protégé | Délai de 15 jours, annulation possible avant l’échéance, anonymisation/masquage du profil à échéance. La tâche est liée à son identifiant cron enregistré. |

## Vérifications de droits et cas limites

| Cas limite | Résultat attendu | État |
| --- | --- | --- |
| Invitation acceptée après suppression de ressource | Refus explicite, statut `invalid` | Couvert par logique de réponse et tests tRPC. |
| Invitation expirée | Refus explicite, statut `invalid` | Couvert par les listes et la réponse. |
| Utilisateur non autorisé qui modifie ou annule | Erreur `BAD_REQUEST`/`FORBIDDEN` côté serveur | Couvert par les helpers de contrôle d’accès ; l’interface n’expose pas l’action. |
| Organisateur qui annule une sortie | Participants marqués annulés et notifiés | Implémenté dans la transaction applicative d’annulation. |
| Profil privé depuis un lien public | Non résolu | Contrôle de visibilité dans la résolution d’identifiant public. |
| Suppression de profil avant 15 jours | Demande annulable | Implémenté dans l’onglet Compte. |
| Fiche Explorer avant ou après confirmation | Préparation verrouillée avant inscription, active pour une participation `going` | Couvert par un test UI de `EventDetail`. |
| Repères de confiance opérationnels | Téléphone, statut guide, assurance, sorties réalisées, check-ins participants et suivis sécurité | Les données sont visibles dans la fiche et les cartes marketplace. Le suivi de présence correspond au ratio de check-ins participant enregistrés parmi les participations `going` de sorties terminées ; il ne constitue pas une garantie. |
| Explorer : période et carte | Sélection « Passées », ouverture depuis la liste, repère de carte, aperçu et fiche | Couvert par un test UI de `EnhancedExplorePage`, qui sélectionne successivement un repère publié puis un repère de démonstration. |
| Explorer : sources de données | Données de démonstration seulement en l’absence de publication ; période cohérente dans les deux cas | Couvert par les fonctions `resolveExploreEvents` et `filterExploreEvents`, exercées avec une sortie publiée et une sortie de démonstration. |
| Explorer : publication de la base | Liste publique serveur, sélection de source, période, repère, aperçu et fiche | La procédure `events.list` est couverte avec une sortie publiée ; les tests de source et de carte poursuivent ensuite ce parcours jusqu’à l’ouverture de la fiche. |
| Notifications | Liste, lecture individuelle et lecture globale | Couvert par un test de contrat tRPC vérifiant la propagation de l’identifiant de l’utilisateur authentifié. |
| Cycle de sortie confirmé | Inscription, notification, préparation persistante et débrief public | Couvert par un test de contrat reliant la participation `going`, les quatre étapes de préparation et la publication d’un `outing_recap`. |
| Limite de médias sociaux | Publication avec cinq photos au maximum | Le schéma refuse une sixième image ; les parcours d’amitié, groupe, messagerie et blocage sont couverts par les contrats protégés. |

## Limites de validation restante

La validation automatisée couvre les contrats, les autorisations principales et les composants de préparation existants. Une recette manuelle avec deux comptes distincts reste recommandée avant un lancement public pour simuler les notifications réelles, l’ouverture du QR code depuis un appareil mobile et l’acceptation des délégations entre deux sessions.
