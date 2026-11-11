# Prochaine fonctionnalité majeure proposée : l’itinéraire opérationnel et le plan B

## Recommandation

Je recommande de faire du prochain grand chantier le module **Itinéraire opérationnel et plan B**. Il compléterait le positionnement central de TrailConnect : transformer une sortie de groupe en une expérience préparée, partageable et ajustable, plutôt qu’en une simple publication accompagnée d’une discussion.

TrailConnect dispose déjà des fondations utiles : import GPX/KML, informations de départ, facilités, météo indicative, fiche Jour J hors ligne, message épinglé et retours de conditions. Le module proposé relierait ces données dans une même lecture opérationnelle, avant et pendant la sortie.

> **Objectif produit :** donner au groupe une compréhension commune de l’itinéraire, des points de rendez-vous et des alternatives documentées, sans présenter ces informations comme une garantie d’accessibilité ou de sécurité.

| Élément | Proposition concrète | Bénéfice utilisateur |
|---|---|---|
| Fiche d’itinéraire | Frise de parcours avec départ, stationnement, points d’attention, durée indicative et retour | Le groupe visualise le déroulé avant de partir. |
| Points opérationnels | L’organisateur associe à la trace des repères factuels : toilettes, eau, croisement, signal, stationnement ou zone à vérifier | Les détails pratiques cessent d’être dispersés dans les messages. |
| Plan B structuré | Une alternative comprend un titre, un point de rendez-vous, une courte raison, une trace/lien facultatif et un statut publié | L’organisateur peut expliciter une solution sans promettre que la solution est praticable. |
| Journal de modification | Toute mise à jour du plan A ou B est horodatée et visible aux participants | Le groupe sait ce qui a changé et quand. |
| Consultation hors ligne | La fiche Jour J existante intègre la frise, les repères et le plan B publié | Le groupe conserve l’essentiel même sans réseau. |

## Première version recommandée

La première version doit rester centrée sur l’opérabilité, pas sur une cartographie coûteuse ou une navigation GPS en temps réel. Elle peut être livrée en trois incréments complémentaires.

| Incrément | Périmètre | Décision de conception |
|---|---|---|
| 1. Préparer | Ajout de repères d’itinéraire et d’un plan B structuré dans la création/modification de sortie | L’organisateur fournit les faits disponibles ; aucun calcul ne valide le parcours. |
| 2. Partager | Frise d’itinéraire dans le dossier de sortie et la fiche Jour J, avec mise à jour visible | Les participants consultent et enregistrent le plan, sans le modifier. |
| 3. Boucler | Les comptes-rendus de conditions peuvent être reliés à un point du parcours | Les retours servent à contextualiser une future préparation, sans notation de sentier. |

Cette séquence exploite l’existant plutôt que de recréer un écosystème de cartographie. Elle est cohérente avec le mobile, le mode hors ligne et le PDF Jour J déjà en place.

## Autres propositions majeures, à programmer ensuite

| Priorité | Module | Intérêt | Pourquoi après l’itinéraire opérationnel |
|---|---|---|---|
| 2 | **Séries de sorties et abonnements organisateur** | Permettre à un organisateur de publier un cycle récurrent, gérer les inscrits et conserver le même cadre logistique | Cela devient plus utile une fois que la préparation d’une sortie isolée est très robuste. |
| 3 | **Hub de disponibilité collective** | Centraliser disponibilités, liste d’attente, covoiturage et choix de créneau pour une prochaine sortie | Le problème est important, mais dépend d’abord d’un dossier de sortie clair et réutilisable. |
| 4 | **Veille locale de sentiers** | Agréger des liens officiels de fermeture, d’accès ou de conditions par région | Valeur forte, mais dépend de sources externes, de leur disponibilité et d’une politique claire sur le caractère indicatif des données. |

## Ce que je déconseille à ce stade

Je déconseille de lancer d’abord un fil social enrichi, des stories ou des badges de popularité. Ces éléments peuvent soutenir la rétention, mais ne renforcent pas le différenciateur déjà engagé : **préparer et faire fonctionner une sortie de groupe dans le monde réel**.

## Critères de réussite

La version 1 sera utile si un organisateur peut documenter un plan B en moins de deux minutes, si un participant peut retrouver le parcours et les repères pratiques sur sa fiche Jour J, et si les modifications sont clairement visibles sans créer d’illusion de sécurité. Les contrôles de qualité devront couvrir le mobile, l’enregistrement hors ligne, le PDF, les rôles organisateur/coorganisateur et les formulations non prescriptives.

## Recommandation de lancement

Je recommande de démarrer par l’incrément 1 et 2 ensemble : **repères d’itinéraire + plan B structuré + affichage Jour J hors ligne**. Cette combinaison crée une amélioration majeure immédiatement perceptible, sans dépendre d’un fournisseur de cartographie, d’un service d’e-mail ou d’une source externe supplémentaire.
