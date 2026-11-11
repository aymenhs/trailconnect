# Import AllTrails — constats de conception

TrailConnect peut accepter un lien de partage AllTrails fourni volontairement par l’organisateur. AllTrails indique qu’un sentier peut être partagé depuis sa fiche par un lien copié, SMS, courriel, intégration ou QR code. L’import doit donc accepter les URL AllTrails directes et les liens courts redirigés, sans utiliser de session ni de données privées.

Les données de conditions AllTrails sont dynamiques et peuvent varier selon le moment et l’emplacement sur le sentier. Elles incluent notamment des repères météo et terrain, et une partie plus détaillée dépend de l’offre AllTrails. TrailConnect ne doit donc pas copier ni présenter ces informations comme une prévision propriétaire ou une garantie. Les coordonnées ou le lieu éventuellement importés doivent plutôt alimenter l’aperçu météo indicatif déjà proposé par TrailConnect, avec ses sources officielles régionales et ses avertissements existants.

| Donnée visée | Traitement TrailConnect | Limite |
|---|---|---|
| Titre et lien du sentier | Préremplissage et conservation de la source AllTrails | L’organisateur confirme avant publication |
| Distance et dénivelé publics | Préremplissage lorsqu’ils sont explicitement accessibles | Valeurs indicatives, modifiables |
| Lieu ou coordonnées accessibles | Préremplissage et déclenchement de l’aperçu météo TrailConnect | Ne remplace pas une trace GPX/KML ou une vérification terrain |
| Tracé précis | Lien source et import GPX/KML séparé | Aucun contournement de données privées ou réservées |
| Météo et conditions | Aperçu TrailConnect fondé sur son système indicatif | Données variables, pas une alerte officielle ni une promesse de sécurité |

## Sources

1. [AllTrails Help — How to share a trail](https://support.alltrails.com/hc/en-us/articles/360019246111-How-to-share-a-trail)
2. [AllTrails Help — Trail Conditions](https://support.alltrails.com/hc/en-us/articles/36933535617300-Trail-Conditions)
