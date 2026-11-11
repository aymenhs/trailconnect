# Audit marketplace — TrailConnect

TrailConnect est vérifié ici comme une marketplace de randonnées de groupe qui relie **hikers**, **organisateurs** et **guides**. L’interface ne présente ni les niveaux, ni la météo, ni les repères de confiance comme une garantie de sécurité.

| Persona | Découvrir et rencontrer | Organiser et coordonner | Confiance et sécurité |
| --- | --- | --- | --- |
| Hiker | Recherche mobile, carte avec repères, filtres de période et matching explicable par niveau, distance, dénivelé, langue, intérêts, disponibilité, taille de groupe et covoiturage. | Demande ou réservation, dossier de préparation après confirmation, rendez-vous, covoiturage, checklist et consultation hors ligne. | Consents, SOS 911, facilités déclarées, météo indicative, difficulté expliquée et repères organisateur fondés sur données enregistrées. |
| Organisateur | Publication publique, privée ou sur invitation ; profil et identifiant partageable. | Création en quatre étapes, trace GPX/KML, image, logistique, niveau, participants, coorganisation, modification et annulation avec information des participants. | Signaux de profil, règles de participation, check-ins, suivi volontaire et limites de responsabilité visibles. |
| Guide | Profil guide avec zones, langues, qualifications, soumission et revue administrative. | Sorties guidées, prix CAD, modalités instantanées ou sur demande. | Statut guide approuvé, attestation d’assurance déclarée et repères affichés dans la fiche et la marketplace. |

## Vérification des cinq repères TrailConnect

| Repère | Surface principale | État de l’audit |
| --- | --- | --- |
| Logistique | Dossier de sortie, Mes sorties, préparation et covoiturage | Présent et activé après confirmation, pour ne pas confondre une simple consultation avec une sortie coordonnée. |
| Rencontre | Profils publics, demandes d’amitié, communautés, messages et matching | Présent ; les demandes et invitations exigent une acceptation explicite. |
| Organisation | Création multi-étapes, participants, coorganisateurs, communautés et cycle de sortie | Présent ; les droits de modification et d’annulation sont contrôlés côté serveur. |
| Confiance | Téléphone, guide, assurance, sorties réalisées et suivi de présence | Présent dans la fiche et la marketplace, avec une formulation non prescriptive. |
| Sécurité | Consentements, SOS, météo, GPX, check-ins et hors ligne | Présent avec des limites explicites ; aucune surface ne promet la sécurité du terrain, la disponibilité d’un secours ou l’exactitude d’une prévision. |

La fiche d’événement affiche désormais un panneau **« Repères TrailConnect »** juste avant le dossier de préparation et l’action de participation. Il rappelle explicitement la logistique, la rencontre, l’organisation, la confiance et la sécurité. Le panneau adapte le rappel logistique selon que le covoiturage est proposé et sa présence est couverte par le test UI de la fiche.

## Décisions de cohérence

Le cycle opérationnel recommandé — **découvrir, vérifier l’adéquation, rejoindre, préparer, partir, débriefer** — reste cohérent entre Explorer, la fiche d’événement et Mes sorties. Les données de préparation ne sont activées qu’après une participation confirmée, et les événements annulés invalident les délégations en attente tout en informant les participants.

Les principales dépendances restantes concernent l’activation d’un fournisseur de rappels transactionnels et les modalités distinctes que le fournisseur OAuth expose réellement pour l’inscription ou la récupération d’accès. Elles ne doivent pas être simulées dans l’application.

## Contrôles administratifs vérifiés

Le panneau Réglages permet de modifier la locale, les unités et les fuseaux canadiens, l’approbation d’organisateur, la publication communautaire et les rappels de départ. Les tests de contrat vérifient qu’un utilisateur standard est refusé par chaque mutation administrative sensible, tandis qu’un super utilisateur peut mettre à jour ces réglages et les politiques d’intégration, suspendre un compte non administrateur, masquer un contenu ou un message, et résoudre une réclamation. Les validations empêchent également l’approbation d’un guide sans attestation d’assurance.
