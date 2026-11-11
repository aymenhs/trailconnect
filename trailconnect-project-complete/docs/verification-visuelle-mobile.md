# Vérification visuelle mobile — accueil TrailConnect

Date de contrôle : 14 août 2026. Vue contrôlée : accueil, largeur 390 px, hauteur 844 px.

| Élément observé | Résultat | Décision |
| --- | --- | --- |
| Hiérarchie de l’accueil | Le titre, le visuel de randonnée, l’appel à explorer et les cartes de sorties restent lisibles sans chevauchement visible. | Conservé. |
| Navigation mobile | La barre de navigation basse demeure visible et les six destinations restent identifiables. | Conservé. |
| Cartes d’événements | Les images, niveau, date, localisation et métriques restent lisibles à 390 px. | Conservé. |
| Localisation de la voix | Le badge de démonstration est passé de `Preview` à `Aperçu` lorsque le français est actif. | Corrigé. |

Cette vérification ne couvre pas les écrans authentifiés, l’administration ni une session réelle de carte ; ils restent à examiner dans leurs parcours dédiés.

## Contrôle complémentaire

Une seconde capture mobile complète confirme que les cartes d’événement conservent leur image, date, niveau coloré, lieu et métriques sans débordement à 390 px. Les actions principales et le sélecteur de langue demeurent visibles en haut de page ; la navigation basse conserve ses libellés sur la vue non capturée en pleine page. La recette visuelle de l’administration reste dépendante d’une session administrateur réelle.

Une capture de vue initiale confirme également que la navigation basse demeure présente dans le viewport mobile avec ses six destinations, et que l’appel « Explorer autour de moi » reste accessible avant le défilement.

Après l’augmentation globale de l’échelle, une vérification à 390 px a confirmé la lisibilité du contenu, des consignes et de l’appel principal. La barre basse a été ajustée pour éviter la troncature des destinations ; ses libellés conservent une taille cible de 14 px tout en restant contenus dans chaque action.

La validation finale applique une base de 16 px pour les contenus et instructions, 14 px pour les libellés, et une hauteur interactive minimale de 44 px sur mobile. Les six entrées de la barre basse utilisent des intitulés courts — Accueil, Carte, Sorties, Créer, Groupes et Profil — afin de rester entièrement visibles à 390 px. Les cartes de sortie affichent désormais titres, lieux, niveaux et métriques dans une taille renforcée sur mobile et web.

## Cycle de sortie — contrôle mobile ciblé

Le 14 août 2026, une capture à 390 × 844 px a validé l’entrée du cycle côté hiker : l’appel « Explorer autour de moi », la première carte de sortie et la barre basse restent visibles sans chevauchement. La suite du cycle — inscription, préparation, pointage de départ et débrief — est couverte par le scénario UI intégré de la fiche de sortie, qui vérifie les états non inscrit, participant confirmé, pointage de sécurité et publication du débrief.

La hiérarchie a également été contrôlée sur une vue web 1280 px : navigation latérale, appel principal, cartes de sortie, repères de confiance et informations de conditions conservent une lecture nette et des actions visibles. La vérification visuelle d’une session Super utilisateur réelle reste volontairement séparée car elle nécessite une identité administrateur active.

## Contrôle de confinement horizontal — 14 août 2026

Un contrôle automatisé a mesuré la largeur réelle du document à **320, 375 et 390 px**. Sur les vues publiques Accueil, Explorer, Création, Communauté et Fiche sortie, la largeur du document est restée égale à la largeur du viewport ; aucun défilement horizontal de page n’a été détecté. Les rangées de filtres et d’onglets conçues pour se faire défiler horizontalement restent des rails internes, sans élargir le document.

| Largeur | Accueil | Explorer | Création | Communauté | Fiche sortie |
| --- | --- | --- | --- | --- | --- |
| 320 px | Conforme | Conforme | Conforme | Conforme | Conforme |
| 375 px | Conforme | Conforme | Conforme | Conforme | Conforme |
| 390 px | Conforme | Conforme | Conforme | Conforme | Conforme |

La correction comprend un confinement horizontal au niveau du document, des cartes de sortie dont le niveau passe sous le titre sur petit écran, et des colonnes de messagerie qui peuvent se contracter. Les écrans Compte et Administration, ainsi que le panneau de gestion de groupe, restent à vérifier dans une session authentifiée dédiée avant une clôture responsive globale.

## Recontrôle des cartes et overlays — 14 août 2026

Un recontrôle a révélé qu’à **320 px** une carte de l’accueil pouvait conserver sa largeur intrinsèque dans une grille et être rognée malgré le confinement du document. La carte est maintenant explicitement rétractable (`min-w-0` et `max-w-full`) : sa largeur calculée passe de 335 px à 288 px dans une zone de contenu de 288 px. Une nouvelle capture à 320 × 844 px confirme que les titres se répartissent sur plusieurs lignes et que la carte, l’image, le niveau, le lieu et les métriques restent entièrement visibles.

L’audit automatisé a ensuite été relancé pour Accueil, Explorer, Création, Communauté et Fiche sortie, aux largeurs 320, 375 et 390 px. Pour les quinze combinaisons contrôlées, la largeur du document est égale à celle du viewport et aucun élément hors viewport n’a été relevé. Les écrans authentifiés Compte et Administration restent un contrôle manuel dépendant d’une session ayant le rôle correspondant ; les tests UI existants y couvrent néanmoins les états vides, le focus et les cibles tactiles.

## Matrice QA — états vides des surfaces principales

| Surface | État vide annoncé | Vérification automatisée |
| --- | --- | --- |
| Compte | Alertes, relations et invitations de coadministration | Scénario authentifié de l’espace Compte |
| Communauté | Aucune publication ou aucun groupe à afficher | Test d’accessibilité Communauté |
| Messagerie | Aucune conversation disponible | Test de région Messagerie et interaction clavier |
| Mes sorties | Aucun départ à préparer | Test de la vue Mes sorties |
| Administration | Aucune entrée dans les files de gestion | Test d’accessibilité Administration |
| Marketplace | Aucune sortie ne correspond aux préférences | Test Marketplace avec action d’actualisation |

Le test transversal `emptyStates.sweep.test.ts` vérifie que ces six surfaces conservent à la fois une annonce de statut et une assertion automatisée associée.

## Vérification complémentaire — 15 août 2026

La page d’accueil publiée a été contrôlée visuellement à **320 × 812 px** après les correctifs de création. Les cartes de sortie passent en pile verticale, la typographie reste lisible et aucun contenu ni contrôle n’est rogné horizontalement dans la capture. Cette vérification complète les mesures automatisées déjà consignées ; les surfaces authentifiées restent suivies séparément.

Les captures complètes à **375 × 812 px** et **390 × 844 px** confirment le même comportement : en-tête, visuel, appel à explorer, cartes, niveaux et métriques restent dans le viewport, sans recadrage horizontal ni chevauchement visible.

## Clôture des surfaces authentifiées — preuve automatisée

Les surfaces nécessitant une identité ont été clôturées avec les rendus et assertions disponibles dans le projet : `AccountProfilePage.auth.test.tsx` pour le compte connecté, `AdminPage.accessibility.test.tsx` pour l’administration, `GroupManagementPanel.mobile.test.tsx` pour l’overlay de groupe et `MessagingPanel.accessibility.test.tsx` pour la messagerie. Les règles de confinement globales — document, root, images, contrôles, overlay fixe et enfant centré — sont vérifiées dans `index.accessibility.test.tsx`.

| Surface | Preuve de confinement et d’accessibilité | État de recette |
| --- | --- | --- |
| Compte | Rendu authentifié, onglets, états, cibles tactiles et focus. | Couvert automatiquement. |
| Administration | Rendu d’états de file, onglets et contrôles accessibles. | Couvert automatiquement. |
| Gestion de groupe | Rendu du panneau dans l’overlay fixe et règle de largeur contractible. | Couvert automatiquement. |
| Messagerie | Région nommée, état vide, actions tactiles et colonnes rétractables. | Couvert automatiquement. |

Une session administrateur dédiée reste recommandée lors d’une prochaine campagne de recette métier, mais ne révèle pas d’écart connu après les contrôles de composants, les règles CSS et les tests de régression exécutés pour cette livraison.

## Mesure réelle du panneau de gestion de groupe

Le composant réel `GroupManagementPanel` a été rendu avec un jeu de réponses tRPC de recette, puis mesuré dans Chromium aux trois largeurs de référence. Dans chaque cas, la largeur du document et celle de l’overlay sont égales à la largeur du viewport ; le panneau central demeure strictement en retrait et ne produit aucun débordement horizontal.

| Viewport | Largeur document | Bord droit overlay | Largeur panneau | Bord droit panneau | Résultat |
| --- | ---: | ---: | ---: | ---: | --- |
| 320 px | 320 px | 320 px | 288 px | 304 px | Conforme |
| 375 px | 375 px | 375 px | 343 px | 359 px | Conforme |
| 390 px | 390 px | 390 px | 358 px | 374 px | Conforme |
