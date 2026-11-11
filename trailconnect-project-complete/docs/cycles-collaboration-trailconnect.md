# Cycles de collaboration TrailConnect

Ce document décrit les états qui guident les contrôles serveur et les messages d’interface pour les relations sociales, la délégation et les suppressions. Il sert de référence d’audit et ne remplace pas les CGU, les politiques de confidentialité ou les procédures de modération.

## Identifiant public et demande d’amitié

| Étape | État | Acteur autorisé | Conséquence visible |
| --- | --- | --- | --- |
| Partage | Profil public | Propriétaire du profil | Lien `/u/{identifiant}`, QR code, copie et partage WhatsApp/SMS. |
| Demande | `pending` | Visiteur connecté | La relation ne devient pas automatiquement une amitié. |
| Décision | `accepted` ou `declined` | Destinataire uniquement | La demande est acceptée ou refusée dans l’espace Compte. |
| Retrait | Relation supprimée | L’un ou l’autre membre | La relation est retirée de manière symétrique. |
| Blocage | Contact bloqué | Membre concerné | Les contacts directs sont empêchés conformément aux règles de messagerie. |

Un profil privé ne peut pas être résolu depuis un lien public. Une action sur un identifiant absent, privé ou invalide retourne une erreur explicite plutôt qu’une relation implicite.

## Coorganisation de sortie

| Étape | État | Acteur autorisé | Contrôle / conséquence |
| --- | --- | --- | --- |
| Invitation | `pending` | Organisateur principal | Invitation adressée par identifiant public, avec notification et échéance de 14 jours. |
| Consultation | `pending` | Organisateur principal | Les invitations envoyées peuvent être consultées et révoquées. |
| Acceptation | `accepted` | Personne invitée | Création du rôle de coorganisateur ; modification de la sortie autorisée. |
| Refus | `declined` | Personne invitée | Aucun droit de gestion n’est accordé. |
| Révocation | `revoked` | Organisateur principal | Seule une invitation toujours en attente peut être révoquée. |
| Invalidation | `invalid` | Système à la réponse | La sortie supprimée, annulée, terminée ou une invitation échue interdit l’acceptation. |

> Un coorganisateur accepté peut modifier les informations essentielles de la sortie. L’annulation de la sortie, l’invitation et la révocation de coorganisateurs restent réservées à l’organisateur principal.

## Coadministration de communauté

| Étape | État | Acteur autorisé | Contrôle / conséquence |
| --- | --- | --- | --- |
| Invitation | `pending` | Propriétaire de communauté | Sélection de la communauté possédée et invitation par identifiant public. |
| Acceptation | `accepted` | Personne invitée | Le rôle membre devient administrateur/modérateur. |
| Refus | `declined` | Personne invitée | Aucun rôle supplémentaire n’est attribué. |
| Révocation | `revoked` | Propriétaire de communauté | Une invitation en attente peut être retirée. |
| Invalidation | `invalid` | Système à la réponse | La suppression ou l’inaccessibilité de la communauté, son expiration ou une invitation déjà traitée interdit la délégation. |

Le formulaire de délégation et la boîte de réception sont regroupés dans l’espace Compte. Les règles serveur restent la source d’autorité lorsque l’interface est ouverte dans plusieurs sessions.

## Modification et annulation de sortie

| Action | Autorisation | Conséquence |
| --- | --- | --- |
| Modification | Organisateur principal ou coorganisateur accepté | Mise à jour des informations essentielles avec les validations de création et de difficulté. |
| Annulation | Organisateur principal uniquement | Statut de sortie `cancelled`, participations annulées, invitations de coorganisation en attente invalidées et notification des participants. |
| Après annulation | Aucun gestionnaire | La sortie ne peut plus être modifiée et les actions de participation deviennent indisponibles. |

## Suppression différée de profil

| Étape | État | Conséquence |
| --- | --- | --- |
| Demande | `deletionRequestedAt` + `deletionScheduledAt` | L’échéance est fixée à quinze jours ; le compte reste réversible. |
| Rétractation | Dates annulées | La demande est retirée avant l’échéance. |
| Finalisation | `deletedAt` | Le cron quotidien retire la visibilité, l’identifiant public et les médias de profil selon les règles de conservation. |

La tâche quotidienne de finalisation est authentifiée et liée à un identifiant de tâche enregistré, afin d’éviter qu’un autre appel planifié de l’application déclenche cette opération.
