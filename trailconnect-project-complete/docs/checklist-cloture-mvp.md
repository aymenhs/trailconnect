# Checklist de clôture MVP — TrailConnect

Cette checklist relie les priorités du MVP aux surfaces applicatives, aux contrats serveur et aux preuves automatisées maintenues dans le projet. Elle distingue les fonctionnalités opérationnelles livrées des validations visuelles authentifiées qui restent explicitement suivies dans `todo.md`.

| Priorité MVP | Fonctionnalité livrée | Preuve applicative | Preuve de validation |
| --- | --- | --- | --- |
| Découvrir et filtrer | Recherche, filtres de période, difficulté, métriques, réservation et carte avec aperçu ouvrable. | `EnhancedExplorePage.tsx`, `Home.tsx`, `hikingRouter.ts` | `EnhancedExplorePage.test.tsx`, `Home.exploreData.test.tsx` |
| Créer et organiser | Création guidée, image, GPX/KML, recommandation de niveau, logistique, météo indicative et facilités. | `CreateEventPage.tsx`, `server/db.ts`, `hikingValidation.ts` | `CreateEventPage.difficulty.test.tsx`, tests difficulté et GPX côté serveur |
| Participer | Inscription directe ou sur demande, liste d’attente, politique de niveau, exception documentée et préparation. | `EventDetail`, `events.join`, `events.promoteWaitlist` | `Home.eventDetail.test.tsx`, `hikingRouter.test.ts` |
| Coordonner le groupe | Rendez-vous, checklist, covoiturage et réservation de sièges, présence, statut prêt et journal de coordination. | `GroupLogisticsPanel`, `CarpoolSeatControls`, `CoordinationJournal` | `Home.eventDetail.test.tsx`, `hikingRouter.test.ts` |
| Confiance et sécurité | Signaux de confiance, conditions d’usage prudentes, SOS 911, consentement de partage et météo non prescriptive. | `HostTrustPanel`, `SafetyHub`, `WeatherOutlook` | `MarketplacePage.trust.test.tsx`, tests sécurité, notifications et préparation |
| Profil et communauté | Profil personnalisable, identifiant public, QR, liens, publications, amis, cercles, groupes et invitations. | `SocialProfilePage.tsx`, `SocialCommunityPage.tsx`, `PublicProfilePage.tsx` | `SocialProfilePage.auth.test.tsx`, `SocialCommunityPage.accessibility.test.tsx`, contrats sociaux serveur |
| Messagerie et modération | Messages directs et de groupe, politiques de contact, blocage, signalement et modération par canal. | `MessagingPanel.tsx`, `hikingRouter.ts` | `MessagingPanel.accessibility.test.tsx`, `hikingRouter.test.ts` |
| Administration | Gestion des utilisateurs, réclamations, contenu, réglages Canada et intégrations outdoor. | `AdminPage.tsx`, procédures `admin` | `AdminPage.accessibility.test.tsx`, protections administrateur côté serveur |

## Décision de clôture fonctionnelle

Les parcours MVP prioritaires sont implémentés et couverts par des tests unitaires, de contrat ou d’interface. La dernière régression avant publication du correctif profil/participation a validé **128 tests**, le contrôle TypeScript et le build de production.

> Les tâches de validation visuelle des écrans authentifiés et d’administration ne sont pas assimilées à une fonctionnalité manquante. Elles restent ouvertes comme contrôles QA dépendant d’une session active ayant les droits requis.

## Éléments volontairement différés

Les fournisseurs OAuth supplémentaires, l’e-mail transactionnel, Strava OAuth et les intégrations sociales natives ne sont pas actifs. Ce report est intentionnel : l’application conserve le fournisseur d’identité existant, des notifications in-app et les liens externes documentés jusqu’à la décision produit ou la disponibilité des fournisseurs concernés.

## Revue des dépendances de recette

Le suivi a été relu après chaque correctif de parcours. Les seules entrées encore ouvertes concernent la mesure visuelle d’écrans nécessitant une identité active — Compte, administration et panneau de gestion de groupe — aux largeurs 320, 375 et 390 px. Elles ne bloquent pas les contrats de données ou les parcours publics validés, mais restent distinctes jusqu’à ce qu’une session appropriée permette leur contrôle réel.
