# Vérification visuelle — Recherche de sorties

Le 13 août 2026, la vue **Explorer les sorties** a été vérifiée dans la prévisualisation. Elle affiche trois cartes illustratives géographiquement cohérentes au Canada : Mont-Tremblant (Laurentides), Mont-Saint-Hilaire (Montérégie) et le sentier du lac Pimbina (Parc national de la Mauricie, Québec).

L’interface de recherche expose le champ texte, les raccourcis de difficulté, le basculement liste/carte, le compteur de résultats et le bouton de filtres avancés. Ce dernier ouvre le panneau des critères complémentaires implémenté dans `EnhancedExplorePage`.

Après l’enrichissement de l’exploration, le parcours a été à nouveau contrôlé. Le filtre de période **À venir** est sélectionné par défaut, tandis que **Passées** et **Tous** sont proposés comme alternatives. Les cartes de sortie canadiennes restent lisibles dans la vue liste.

Le mode **Carte** initialise des repères numérotés pour les sorties filtrées et expose l’invite de sélection ainsi que la zone de prévisualisation associée. La console de prévisualisation ne remonte pas d’erreur pendant cette initialisation. Le rendu de fond cartographique peut dépendre de la disponibilité du fournisseur de cartes dans la prévisualisation, sans empêcher le basculement liste/carte ni l’initialisation des marqueurs.
