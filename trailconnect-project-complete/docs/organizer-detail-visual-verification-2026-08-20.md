# Vérification visuelle — fiche organisateur compacte

La fiche de sortie ouverte depuis `?event=1` a été vérifiée à 390 × 844 px et 1280 × 720 px. Le bouton fixe bilingue **Gérer / Manage** reste visible près des contrôles Retour et Fermer, sans recouvrir le titre, les métriques ou les actions de fermeture.

Sur téléphone, il apparaît dans la première zone visible, après l’image de couverture, avant les informations de confiance et les contenus secondaires. Sur ordinateur, le bouton reste distinct du bouton de fermeture, à droite de la fenêtre superposée. Les contrôles utilisent des cibles tactiles de 44 px environ et les libellés restent lisibles.

## Vérification de la vue de pilotage dédiée

Après la réduction supplémentaire du défilement, le raccourci **Gérer / Manage** ouvre une vue de pilotage dédiée plutôt que de faire défiler la fiche de sortie vers les modules organisateur. Le raccourci est resté visible et distinct des deux contrôles de fermeture à **390 × 844 px** ainsi qu’à **1280 × 720 px**.

La fiche principale conserve son contexte de sortie — image, métriques et bref descriptif — tandis que la gestion des candidatures, des participants, des présences, de la liste d’attente, des essentiels éditables et de l’annulation est isolée dans le tiroir. Cette séparation évite d’imposer le défilement des contenus de préparation, météo, logistique, sécurité ou discussion avant d’atteindre les commandes organisateur.

## Compactation du dossier de sortie

La fiche conserve à l’ouverture les informations nécessaires pour s’orienter : couverture, date, titre, lieu, métriques, bref descriptif, confiance et action de participation ou de gestion. Le reste est regroupé dans la rubrique repliée **Dossier de la sortie / Outing details**, qui donne accès sur demande au parcours, à la météo, à la préparation, au transport, à la sécurité et à la discussion.

Les contrôles visuels publics à **1280 × 720 px** et **390 × 844 px** ont confirmé que la page publique ne comporte pas de session organisateur. La régression de l’état replié est couverte au test de fiche : le dossier est fermé au chargement et s’ouvre explicitement à l’activation de sa rubrique.
