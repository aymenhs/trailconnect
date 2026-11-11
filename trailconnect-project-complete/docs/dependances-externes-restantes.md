# Dépendances externes restantes

TrailConnect dispose déjà des préférences de notification, des réglages administratifs et du point de planification pour les traitements internes. Les éléments ci-dessous ne sont pas simulés, car ils dépendent d’un contrat de fournisseur ou de coordonnées qui ne sont pas encore confirmés.

| Dépendance | Fonction concernée | État livré | Prérequis avant activation |
| --- | --- | --- | --- |
| Fournisseur OAuth | Inscription distincte et récupération d’accès | Connexion OAuth sécurisée, bouton explicite de création/récupération, et documentation du flux délégué. | Confirmer les parcours réellement supportés par le portail d’identité, plutôt que d’inventer une URL d’inscription ou de réinitialisation. |
| E-mail transactionnel | Rappels de départ et alertes externes | Préférences par canal, politiques administratives et notifications in-app. | Fournir et configurer un fournisseur transactionnel, ses identifiants et les consentements nécessaires. |
| Planification de rappels | Envoi automatique avant départ | Infrastructure Heartbeat déjà employée pour une tâche quotidienne protégée de suppression différée. | Définir la cadence, les règles de consentement, les modèles de notification et le canal de livraison activé. |
| Intégrations outdoor | AllTrails, Gaia GPS, Strava et Garmin | Bascules administratives et politique de disponibilité. | Confirmer les contrats d’API, les clés et les conditions d’usage pour chaque intégration. |

> Aucun raccourci externe n’est présenté comme actif tant que son fournisseur, ses consentements et ses conditions de fonctionnement ne sont pas confirmés. Cette séparation évite une promesse de rappel, de récupération ou de synchronisation que TrailConnect ne pourrait pas tenir.

La prochaine décision produit nécessaire concerne l’ordre d’activation : il est recommandé de confirmer d’abord le fournisseur OAuth et le canal transactionnel, car ils conditionnent respectivement l’accès autonome et les rappels externes. Les fonctionnalités locales, les notifications in-app et les réglages administratifs restent disponibles indépendamment.

## Décision actuelle

À la demande du projet, TrailConnect conserve à ce stade le fournisseur d’identité déjà configuré et les notifications in-app. Aucun service OAuth supplémentaire, aucune route distincte de récupération, ni aucun fournisseur e-mail transactionnel n’est activé. Les bascules administratives et les préférences restent préparées, mais elles ne sont pas présentées comme une livraison de messages externes.
