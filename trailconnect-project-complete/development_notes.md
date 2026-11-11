# Notes de développement TrailConnect

## État actuel
- Application mobile-first stable et déployée.
- Fonctionnalités avancées : Cockpit organisateur, Dossier de sortie compact, Covoiturage opérationnel, AllTrails intégré manuellement.
- Objectif actuel : Rendre tout le contenu créé (sorties, covoiturage, profil, groupes) facilement modifiable.

## Modifications en cours
- **Covoiturage** : Ajout de la possibilité de modifier un trajet existant (lieu, heure, places) pour le conducteur.
- **Profil** : Amélioration de la visibilité du bouton d'édition.
- **Groupes** : Vérification des options d'administration.

## Points techniques
- Utilisation de `safeExtend` pour étendre les schémas Zod avec des raffinements.
- Backend : Ajout de `updateCarpoolOffer` dans `db.ts` et `hikingRouter.ts`.
- Frontend : Mise à jour de `ConfigurableCarpoolActionHub` dans `Home.tsx` pour gérer l'édition.

## Tâches AllTrails (Bloquées)
- Import automatique AllTrails via lien (en attente d'API partenaire).
- Import AllTrails à la création (en attente d'API partenaire).
- Mise à jour auto AllTrails (en attente d'API partenaire).
