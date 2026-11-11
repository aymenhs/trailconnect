# Audit fonctionnel marketplace

TrailConnect opère comme une marketplace de randonnées de groupe : l’organisateur prépare et publie une sortie, le hiker la découvre selon ses préférences, demande sa participation lorsqu’une validation est requise, puis l’organisateur décide de cette demande. La fiche de sortie centralise la trace, la météo indicative, les facilités, la logistique, le covoiturage, le groupe et les dispositifs de sécurité.

| Parcours | Éléments livrés | Points d’entrée principaux |
|---|---|---|
| Organisateur | Création avec GPX/KML, difficulté, prix CAD, capacité, facilités, météo de trajet, logistique et décisions de participation | `CreateEventPage`, `BookingRequestsPanel`, `GroupLogisticsPanel` |
| Guide | Profil, régions, langues, qualifications, soumission à revue et attestation d’assurance obligatoire avant approbation | `MarketplacePage`, `AdminPage`, `admin.reviewGuide` |
| Hiker | Préférences, recommandations classées, inscription ou demande, check-in, messagerie, offline et signalement | `MarketplacePage`, `EventDetail`, `hiking.marketplace.matches` |
| Confiance | Statut guide, contrôle administratif, réclamations, modération, consentements et formulation de sécurité non prescriptive | `AdminPage`, `SafetyHub`, `docs/safety-and-responsibility.md` |

Les prévisions de montagne sont volontairement un **aperçu indicatif**, échantillonné sur quelques points GPX. Les statuts de sanitaires, eau, stationnement, accueil et réseau sont fournis par l’organisateur avec une valeur « À confirmer » par défaut. Ils ne remplacent pas la vérification du terrain ou les canaux officiels.

Les dépendances non activées restent séparées du produit fonctionnel : fournisseur SMS pour vérification téléphonique réelle, courriel transactionnel pour alertes externes, OAuth pour plateformes outdoor tierces et fournisseur de paiement pour les sorties payantes.
