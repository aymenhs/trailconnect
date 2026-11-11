# Vérification bilingue et confinement des libellés

**Date :** 18 août 2026  
**Périmètre :** accueil, formulaire de création, centre opérationnel, éditeur de tracé et fiche Jour J.

## Constats visuels

| Vue contrôlée | Langue | Largeur | Résultat |
| --- | --- | ---: | --- |
| Accueil | English | 1280 px | Libellés de navigation, carte, boutons et pastilles contenus ; aucune coupure horizontale observée. |
| Création — étape 1 | English | 1280 px | Étapes, champs, brouillon et actions Previous/Next contenus et lisibles. |
| Accueil | English | 390 px | Cartes, badges, actions et navigation mobile contenus sans débordement horizontal observé. |
| Création — étape 1 | English | 390 px | Le libellé « Route and level » revient volontairement sur deux lignes dans sa case d’étape ; il reste entier, tactile et sans chevauchement. Les boutons Previous/Next restent visibles. |
| Accueil | Français | 1280 px | Navigation, cartes, étiquettes de difficulté et boutons contenus ; aucune coupure horizontale observée. |
| Création — étape 1 | Français | 1280 px | Étapes, champs, brouillon local et actions Précédent/Suivant contenus et lisibles. |
| Accueil | Français | 390 px | Titres, cartes, badges et action principale restent dans la largeur de l’écran, sans défilement horizontal observé. |
| Création — étape 1 | Français | 390 px | Le libellé « Parcours et niveau » revient volontairement sur deux lignes ; toutes les étapes, actions Précédent/Suivant et champs restent contenus et tactiles. |

## Correctifs inclus

Les valeurs techniques des listes du centre opérationnel sont maintenant localisées. Les repères de parcours, la source météo locale de la fiche Jour J, les libellés accessibles de l’en-tête et les descriptions d’images de cartes suivent la langue active. Les contrôles globaux imposent également une largeur maximale, une largeur minimale nulle et un retour à la ligne sécurisé pour les boutons ; les sélecteurs tronquent visuellement leur valeur au lieu de sortir de leur conteneur.

> Le paramètre d’adresse `lang=fr` ou `lang=en` permet de contrôler explicitement une version linguistique et synchronise l’attribut `lang` du document. Il ne remplace pas le sélecteur de langue de l’interface.
