# Parcours d’accès sécurisé TrailConnect

TrailConnect délègue l’identité au fournisseur OAuth configuré par l’application. Cette décision évite de stocker, vérifier ou réinitialiser des mots de passe dans TrailConnect.

| Besoin utilisateur | Parcours fourni | Donnée conservée par TrailConnect |
| --- | --- | --- |
| Créer un compte | Le bouton « Se connecter ou créer un compte » ouvre le portail d’identité avec l’application et l’URL de retour attendues. | Identité OAuth confirmée et profil TrailConnect associé. |
| Se connecter | L’utilisateur revient via le callback OAuth protégé par un nonce à usage unique et un cookie `SameSite=None; Secure`. | Session applicative après validation du callback. |
| Récupérer un accès | L’utilisateur utilise le parcours sécurisé du fournisseur d’identité ; l’application ne propose pas de mot de passe local. | Aucun mot de passe, aucune question secrète, aucun jeton de récupération local. |

> Le bouton de gestion d’accès de l’onglet Compte renvoie vers ce même parcours sécurisé. La récupération relève du fournisseur d’identité, ce qui centralise les contrôles de sécurité et évite une implémentation concurrente de mot de passe.

Les écrans non connectés expliquent cette délégation avant d’ouvrir le portail. Les actions authentifiées restent protégées côté serveur.

La présence et le déclenchement du bouton « Créer ou récupérer l’accès » sont couverts par un test UI dédié.
