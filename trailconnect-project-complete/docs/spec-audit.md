# Audit fonctionnel TrailConnect — cible Canada

## Synthèse

La version actuelle couvre le **noyau du MVP** : découverte et création de sorties, import GPX/KML, fil communautaire, messagerie texte, profils, catalogue des intégrations, sauvegarde locale de données utiles et authentification OAuth. Les composants de notification viennent d’être ajoutés côté données et API.

Les fonctions avancées des phases 2 et 3 restent volontairement distinctes des fonctionnalités pleinement disponibles : intégrations OAuth de partenaires, covoiturage transactionnel, météo de montagne, suivi Garmin/GPS, SOS, back office de modération, Premium et clubs/pro. Elles doivent être ajoutées avec leurs fournisseurs, consentements et exigences opérationnelles propres.

| Domaine des spécifications | État actuel | Écart ou amélioration prioritaire |
|---|---|---|
| Création d’événement | Partiel | Prendre en charge photos, équipement personnalisable, ravitaillement, type dans le formulaire et calcul à partir de la trace. |
| Recherche et découverte | Partiel | Rendre visibles les filtres date, distance, dénivelé, type, covoiturage et localisation. |
| Inscription et participants | Partiel | Ajouter vue organisateur, liste d’attente, contrôle de profil et check-in. |
| Fil « Aventures » | Basique | Ajouter médias des utilisateurs, interactions et liens de publication vers les sorties. |
| Chat de groupe | Partiel | Ajouter pièces jointes, messages éphémères, droits de participant et signalement. |
| Profils et badges | Basique | Rendre le profil éditable et calculer les statistiques / badges à partir des activités. |
| Hors connexion | Partiel | Permettre la relecture détaillée de la carte, trace, checklist et contacts sans réseau. |
| Notifications | En cours | Centre persistant et préférences disponibles côté données ; les alertes externes nécessitent un fournisseur d’envoi et un déploiement. |
| Covoiturage | À réaliser | Prévoir conducteurs, sièges, réservations et informations de prise en charge. |
| Checklist dynamique | À réaliser | Générer selon saison, difficulté, météo et dénivelé ; laisser l’organisateur modifier. |
| Points d’intérêt | À réaliser | Ajouter sources, refuges, abris, sorties de secours et ravitaillement sur la carte. |
| AllTrails / Gaia / Strava / Garmin | Préparé | Le catalogue d’intégration est prêt ; les OAuth et synchronisations restent à connecter fournisseur par fournisseur. |
| Météo montagne et alertes | À réaliser | Brancher une source météo adaptée à l’altitude et des règles d’alerte vérifiables. |
| Live tracking / SOS | À réaliser | À réserver à une phase sécurité dédiée avec consentement, contacts d’urgence et politique de rétention. |
| Back office, Premium, Clubs | À réaliser | Hors du MVP immédiat ; à concevoir avec règles de rôle, modération et paiements. |

## Paramétrage cible Canada

L’expérience par défaut doit être **français canadien ou anglais canadien**, avec une préférence conservée dans le profil. Les distances, dénivelés et températures devront privilégier les unités métriques : kilomètres, mètres, degrés Celsius et litres. L’app doit stocker les dates en UTC et afficher les horaires dans le fuseau du participant ou de la sortie ; les fuseaux importants incluent notamment `America/Toronto`, `America/Winnipeg`, `America/Edmonton`, `America/Vancouver`, `America/Halifax` et `America/St_Johns`.

Les avis de sécurité ne doivent jamais être présentés comme des garanties de conditions. Les fonctions de localisation, de contact d’urgence et d’alerte externe devront obtenir un consentement explicite, pouvoir être désactivées par l’utilisateur et s’accompagner d’une durée de conservation lisible.

## Priorités de réalisation

1. **MVP exploitable au Canada :** profil éditable, réglages de région et de notifications, filtres complets, centre de notifications, expérience offline relecture et validation organisateur.
2. **Organisation sécurisée :** checklists ajustables, participants, check-in, points d’intérêt et météo de montagne avec alertes.
3. **Services connectés :** intégrations OAuth choisies, covoiturage, suivi consenti, Premium/Clubs et back office.
