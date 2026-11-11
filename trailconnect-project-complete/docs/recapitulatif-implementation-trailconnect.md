# TrailConnect — récapitulatif fonctionnel, technique et actions restantes

**État documenté :** version publiée `b0b5c78c`  
**Site déployé :** <https://hikingsocial-hbhva9se.manus.space>  
**Base de validation :** 173 tests automatisés dans 42 fichiers, vérification TypeScript sans erreur et build de production réussi.

> Ce document distingue volontairement trois niveaux de maturité : **disponible** signifie qu’un parcours applicatif est publié et couvert par les contrôles du projet ; **préparé** signifie qu’une interface, un consentement ou une fondation est en place, mais qu’un fournisseur, un partenariat ou une configuration reste nécessaire ; **à faire** désigne une action qui n’est pas encore active ou qui doit être décidée avant d’être développée.

## 1. Positionnement et périmètre produit

TrailConnect est conçu comme une plateforme canadienne de sorties de randonnée collectives, avec une priorité donnée à l’**opérabilité de la sortie** plutôt qu’à la croissance sociale seule. Le produit réunit la découverte d’événements, les profils d’organisateurs et de hikers, le matching, la logistique de groupe, la préparation Jour J, la communauté et des signaux de confiance factuels.

La logique de conception repose sur cinq piliers : **logistique**, **rencontre**, **organisation**, **confiance** et **sécurité**. Les écrans sensibles évitent les promesses de sécurité, de disponibilité de sentier, de météo exacte ou de secours. Les informations de niveau, GPX, météo, terrain, couverture cellulaire et points d’eau restent présentées comme des repères indicatifs à vérifier dans le contexte réel.

| Domaine | État | Résultat concret |
|---|---|---|
| Expérience mobile-first et web | Disponible | Interface responsive pour Chrome Android, Safari iOS et écrans de bureau, avec contrôles tactiles adaptés. |
| Bilinguisme canadien | Disponible | Interface française et anglaise, unités métriques/impériales, fuseaux horaires canadiens et montants en CAD. |
| Marketplace de sorties | Disponible | Création, découverte, recherche, inscription, demandes, matching, profils guide/organisateur et signaux de confiance. |
| Coordination collective | Disponible | Covoiturage, checklist, préparation, Jour J, plan B, terrain, décisions et alternatives de dates. |
| Réseau social et communauté | Disponible | Profils, fil, publications, groupes, amis, invitations, messagerie, blocage et signalement. |
| Intégrations externes avancées | Préparé | Consentements et interfaces prêtes pour plusieurs services ; les connexions fournisseur réelles restent à activer. |

## 2. Fonctionnalités disponibles

### 2.1. Navigation, accessibilité et localisation

L’application est organisée autour des surfaces **Découvrir**, **Explorer**, **Mes sorties**, **Créer**, **Communauté**, **Profil**, **Compte** et **Administration**. Les menus et instructions ont été agrandis pour maintenir une lecture confortable sur mobile comme sur le web. Les actions principales visent des zones tactiles d’au moins 44 px, le focus clavier est visible, les sections disposent de libellés accessibles et les états vides sont annoncés de manière exploitable.

Un réglage d’accessibilité permet de choisir une taille de texte standard, grande ou très grande. La préférence est conservée localement. Les sorties utilisent un code couleur constant pour la difficulté : vert pour débutant, ambre pour intermédiaire, orange pour avancé et rouge pour expert. La validation des écrans principaux a inclus la prévention des débordements horizontaux aux largeurs 320, 375 et 390 px.

| Élément d’expérience | Comportement livré |
|---|---|
| Langue | Bascule français/anglais dans l’interface. |
| Accessibilité | Taille de texte ajustable, focus visible, raccourci « Aller au contenu », textes de remplacement et états vides annoncés. |
| Mobile | Navigation adaptée, cartes compressibles, panneaux et modales contrôlés sans scroll horizontal identifié. |
| Canada | Fuseaux horaires canadiens, préférences d’unités, devise CAD et contenus illustratifs centrés sur le Québec, Montréal et les régions accessibles. |

### 2.2. Identité, profil et sécurité de compte

L’authentification repose sur le flux OAuth déjà fourni par la plateforme. Le profil est personnalisable avec avatar, biographie, localisation, préférences, statistiques, liens sociaux et visibilité publique, privée ou réservée aux amis. Chaque profil peut disposer d’un identifiant public partageable, d’un lien et d’un QR code pour initier une relation ou une invitation.

Les utilisateurs peuvent gérer des demandes d’amis, accepter ou refuser une relation, retirer un ami et bloquer un compte. La demande de suppression de profil ouvre une période de rétractation de quinze jours avant la suppression définitive planifiée. Les états de compte actif, suspendu et banni sont présents et appliqués dans les contrôles d’accès.

La vérification de téléphone et les paramètres anti-spam sont prévus dans les modèles et les signaux de confiance. Ils ne doivent pas être interprétés comme une certification de compétence outdoor.

### 2.3. Découverte, cartes et recherche d’événements

La page Découvrir met en avant les sorties et la proposition de valeur. Explorer propose une recherche et des filtres combinables par texte, période, niveau, distance, dénivelé, durée, capacité, covoiturage, type de sortie et mode de réservation. Les sorties à venir sont la vue par défaut, tandis qu’une option permet de consulter les sorties passées.

La vue carte présente des marqueurs de sortie, un aperçu et l’ouverture de la fiche concernée. Les cartes et fiches utilisent les mêmes couleurs de difficulté. Les contenus d’exemple ont été repositionnés dans des zones canadiennes cohérentes, notamment autour des Laurentides, de la Montérégie, de la Mauricie et du nord-est accessible depuis Montréal.

Les images de couverture sont optimisées par chargement différé et proposent des variantes WebP adaptées aux formats mobile et desktop. L’accueil charge sa couverture prioritaire tandis que les cartes secondaires attendent leur affichage. Un point focal optionnel peut maintenant être défini par l’organisation afin de préserver le sujet important lorsqu’une photo est recadrée sur un format étroit.

### 2.4. Création et édition d’une sortie

La création d’une sortie est un flux multi-étapes : **Essentiels**, **Parcours et niveau**, **Logistique**, puis **Publication**. Elle comprend le titre, la description, le lieu, l’horaire, la capacité, la visibilité, le type de sortie, le mode de participation, le prix indicatif, les facilités, la trace, l’image et les paramètres de coordination.

L’organisation peut importer une trace GPX ou KML. Le fichier est transféré par un parcours binaire protégé, puis ses métriques sont utilisées pour aider à renseigner la distance, le dénivelé et les points de prévision. Les métriques sont explicitement indiquées comme indicatives. Les actions Précédent et Suivant restent visibles et la progression est vérifiée étape par étape.

Une image de couverture JPG, PNG ou WebP peut être téléversée, compressée côté navigateur et enregistrée dans le stockage du projet. Depuis la dernière version, l’organisation peut toucher l’aperçu de la photo pour choisir un point d’intérêt. Le choix est facultatif, borné entre 0 et 100 %, accessible au clavier, réinitialisable au centre, enregistré en base et appliqué aux cartes, à Explorer, au détail et à Mes sorties.

| Sous-fonction | Comportement livré |
|---|---|
| Niveau | Recommandation calculée d’après distance, dénivelé, durée, terrain, technicité, exposition, navigation, conditions déclarées et type de sortie. |
| Décision de niveau | L’organisation peut conserver ou modifier le niveau recommandé ; une justification est demandée lorsqu’il diffère. |
| Politique de participation | Mode déclaratif par défaut, confirmation ou revue organisateur disponibles ; une exception documentée peut être acceptée ou refusée. |
| Facilités | Sanitaires, eau, stationnement, accueil, réseau, accessibilité, notes et date de vérification. |
| Couverture | Téléversement, aperçu, variantes responsives et point focal optionnel. |
| Édition | Organisateur et coorganisateur autorisés peuvent mettre à jour les éléments essentiels ; une sortie annulée ou terminée n’est plus modifiable. |

### 2.5. Participation, listes d’attente et préparation

Une sortie réellement publiée propose l’inscription ou une demande de participation selon la règle de l’organisation. Une capacité atteinte déclenche un état de liste d’attente clair. Les demandes peuvent être acceptées ou refusées avec une note documentée. Les aperçus illustratifs ne présentent pas une action d’inscription trompeuse.

Après confirmation, la sortie devient un **dossier de coordination**. Il regroupe le rendez-vous, le covoiturage, la checklist, les conditions, la messagerie de groupe, la préparation, la disponibilité hors ligne, la fiche Jour J et les contacts utiles. Un participant peut marquer volontairement son état « prêt pour la sortie ». L’organisation dispose d’un tableau de départ qui réunit les repères renseignés sans juger l’aptitude ni promettre une sécurité.

Le covoiturage couvre les offres, demandes de sièges, décisions du conducteur, annulations et retrait d’une offre. Lorsqu’un conducteur se désiste, les réservations affectées sont signalées et les sièges de remplacement sont affichés de manière factuelle.

### 2.6. Coordination Jour J, terrain et mode hors connexion

La fiche Jour J rassemble les informations opérationnelles confirmées : rendez-vous, consignes, météo, covoiturage, message épinglé, checklist, repères d’urgence, itinéraire opérationnel et plan B. Elle peut être imprimée ou enregistrée en PDF depuis le navigateur. Les appareils compatibles proposent le partage natif ; un repli de copie est disponible.

Un paquet hors connexion conserve les éléments nécessaires à la préparation et à la consultation locale, notamment la trace, les repères, le plan opérationnel, le plan B et la fiche Jour J. Un QR code facilite l’ouverture de la fiche au rendez-vous.

Les repères terrain gèrent l’eau, les abris et les stationnements. Ils peuvent recevoir une note, un statut, une date de dernière vérification, des coordonnées GPS facultatives et un lien d’ouverture dans l’application de cartographie de l’appareil. L’organisation peut importer des coordonnées depuis un lien Google Maps ou Apple Plans et modifier les repères existants. Les coordonnées et la disponibilité restent explicitement indicatives.

L’itinéraire opérationnel peut être enrichi d’un schéma image, d’un plan B et d’un historique daté des modifications. Les participants confirmés peuvent attester qu’ils ont lu la dernière version. Une mise à jour substantielle crée une notification in-app ciblée, avec le résumé factuel des changements et un accès direct à la sortie concernée. Chaque utilisateur peut désactiver ces alertes dans ses préférences.

### 2.7. Météo, conditions et partage volontaire de position

La création et la fiche de sortie peuvent afficher un aperçu météo de montagne à partir de coordonnées et de quelques points représentatifs de la trace. Les alertes visuelles couvrent notamment les rafales, précipitations, froid et risque d’orage possible. Elles comportent une formulation prudente : il s’agit de données de modèle indicatives, non d’un avertissement officiel, d’une autorisation d’accès ou d’une évaluation de sécurité.

La fiche expose un lien vers une source météorologique officielle régionale, un lien vers le radar officiel et, si l’organisation le renseigne, une source locale complémentaire HTTPS. Une mise à jour météo importante peut être annotée, historisée, notifiée aux participants et confirmée comme lue.

Le partage de position Jour J est strictement volontaire. L’utilisateur choisit une durée de 15, 30 ou 60 minutes ; cette fenêtre ne se prolonge pas automatiquement et l’arrêt est immédiat. Cette fonction n’est pas un service de secours, un suivi garanti ni un substitut à un appel au 911 en situation d’urgence.

### 2.8. Dates alternatives, décisions et invitations manuelles

Le cockpit de coordination permet de publier une décision factuelle de maintien, adaptation ou annulation. Il montre une comparaison de versions de la fiche Jour J, des jalons de préparation collectifs et des signaux post-sortie. L’organisation peut proposer plusieurs dates alternatives ; les participants indiquent leur disponibilité et la date la plus compatible est identifiée.

La date retenue peut être convertie en une nouvelle sortie publiée. Le parcours, la logistique, les repères, la checklist et les coorganisateurs sont copiés ; les participants, réservations, confirmations et historiques personnels ne sont jamais transférés. Un brouillon d’invitation bilingue est ensuite prérempli pour les anciens participants. Il peut être édité, prévisualisé, copié ou partagé manuellement. Aucun destinataire n’est suivi et aucun message n’est envoyé automatiquement.

L’organisation peut enregistrer des modèles personnels et utiliser cinq modèles bilingues : nouvelle date, date la plus compatible, plan adapté, petit groupe et relance conviviale. Les compteurs de copies et partages sont agrégés, sans suivi individuel des destinataires.

### 2.9. Marketplace, guides, matching et confiance

TrailConnect réunit des profils organisateur, guide et hiker. Un profil guide contient un statut, des langues, des régions, des qualifications, des éléments administratifs et une attestation d’assurance. L’interface ne présente pas ces éléments comme une garantie de qualité ou de sécurité.

Le matching prend en compte le niveau, la distance, le dénivelé, les intérêts, les disponibilités, la taille de groupe, les langues et le covoiturage. Les raisons de compatibilité sont affichées afin que le classement reste interprétable.

Les signaux de confiance sont fondés sur des données réellement disponibles : téléphone vérifié, statut guide, historique de sorties, check-ins, réactivité aux demandes et fréquence des mises à jour météo. Aucune note, aucun avis ou témoignage fictif n’est créé dans l’application.

### 2.10. Communauté, groupes et messagerie

Le fil social permet des publications, réactions, abonnements, récits de sorties et photos. Une publication est limitée à cinq photos. Les utilisateurs peuvent constituer un cercle d’amis et suivre l’activité de leurs relations.

Les groupes communautaires disposent d’un créateur propriétaire, de membres et de coadministrateurs. Ils gèrent l’unicité du nom, la confidentialité, les invitations, les liens, le texte, l’image de couverture, le renommage et la suppression. Les invitations de coadministration et de coorganisation sont acceptables, refusables, révocables et invalidées si la ressource ou le rôle disparaît.

La messagerie couvre les conversations de groupe et les messages directs. Les préférences permettent les contacts ouverts, réservés aux amis ou désactivés. Le blocage et le signalement empêchent les contacts non désirés. Les administrateurs de groupe et les super utilisateurs disposent de parcours de modération adaptés.

### 2.11. Notifications et administration

Le centre de notifications gère les inscriptions, messages, rappels, mises à jour Jour J, responsabilités et alertes de conditions. Il propose les états lus/non lus, les compteurs et les actions « tout marquer comme lu ». Les notifications ciblées sont créées pour les rôles attribués, les mises à jour météo et les nouvelles versions Jour J.

L’administration est protégée par un rôle super utilisateur. Elle couvre les utilisateurs, les états de compte, la modération de contenus, les signalements, les guides, les réglages du site, les paramètres Canada, les politiques de notification et le catalogue d’intégrations. Une session utilisateur standard ne peut pas appeler les procédures d’administration sensibles.

## 3. Architecture technique

TrailConnect est une application web full-stack à contrat typé. Le frontend est construit avec **React 19**, le rendu et le packaging avec **Vite**, le style avec **Tailwind CSS 4**, le serveur avec **Express 4**, les appels applicatifs avec **tRPC 11**, et la persistance avec **Drizzle ORM** vers **MySQL/TiDB**. L’authentification est fournie par le flux OAuth intégré au projet.

| Couche | Implémentation | Rôle |
|---|---|---|
| Frontend | React, Tailwind, composants réutilisables et pages métier | Navigation, formulaires, cartes, détail, administration et états accessibles. |
| Contrats | Zod et tRPC | Validation des entrées, typage de bout en bout et procédures protégées. |
| Serveur | Express et routeur tRPC | Autorisations, orchestration des règles métier, appels météo et stockage. |
| Données | Drizzle ORM, MySQL/TiDB | 59 tables métier, migrations versionnées de `0000` à `0040`. |
| Fichiers | Stockage objet du projet | Images, traces GPX/KML et visuels opérationnels référencés par URL. |
| Hors connexion | Paquets locaux structurés | Consultation de la fiche Jour J, route, checklist et repères sauvegardés. |
| Tests | Vitest et Testing Library | Validation du serveur, des contrats, des composants, de l’accessibilité et des parcours critiques. |

### 3.1. Organisation du code

Les modèles de données se trouvent dans `drizzle/schema.ts`. Les migrations sont générées dans `drizzle/` puis appliquées à la base. La validation Zod est centralisée dans `server/hikingValidation.ts`, les opérations de persistance dans `server/db.ts` et les procédures applicatives dans `server/hikingRouter.ts`. Le frontend consomme ces procédures par `client/src/lib/trpc.ts` ; les pages et composants métier sont dans `client/src/pages/` et `client/src/components/`.

Le système de droits vérifie les rôles utilisateur, organisateur, coorganisateur, propriétaire de groupe, coadministrateur et administrateur. Les opérations sensibles vérifient également l’existence et l’état de la ressource avant d’agir, afin que les invitations devenues invalides échouent proprement.

### 3.2. Données et migrations récentes

Le schéma contient les domaines identité, profils, relations, publications, groupes, messages, sorties, participants, covoiturage, logistique, météo, sécurité, préparation, hors connexion, invitations, notifications, modération, intégrations et consentements. Les migrations récentes ont ajouté le parcours opérationnel, le plan B, l’historique Jour J, les repères terrain, les options de date, les modèles d’invitation, les consentements outdoor et le point focal de couverture.

La migration `0040` ajoute `coverImageFocalX` et `coverImageFocalY` à la table des sorties. Ces coordonnées facultatives sont validées ensemble sur une échelle 0–100, persistées par une mutation dédiée et rendues par `object-position`. Sans coordonnées, l’image conserve un recadrage centré.

### 3.3. Médias et performance

Les médias ne sont pas stockés dans le dépôt de l’application. Les actifs sont placés dans un espace statique extérieur puis téléversés vers le stockage du projet. Les URL retournées sont enregistrées dans la base. Les couvertures TrailConnect disposent de variantes WebP mobile et desktop sélectionnées par l’élément HTML `picture`.

Un découpage de code différé charge à la demande les pages secondaires et plusieurs panneaux opérationnels. Le bundle applicatif principal a été réduit lors de cette optimisation ; le build actuel confirme que les pages marketplace, création, profil, administration, exploration et coordination sont séparées en fichiers dédiés. La couverture héro prioritaire se charge immédiatement, tandis que les images secondaires utilisent le chargement différé et le décodage asynchrone.

### 3.4. Sécurité et formulations prudentes

Les procédures tRPC protégées utilisent l’identité connectée et les contrôles de rôle. Les fichiers sont validés par type et taille. Les URLs de couverture, de sources météo et de cartes sont contrôlées. Les permissions empêchent l’édition d’une sortie annulée ou terminée et limitent la coordination aux personnes autorisées.

Le produit ne doit pas être présenté comme un dispositif de secours, de navigation certifiée, de prévision officielle, d’assurance ou de qualification médicale. Le bouton SOS, le 911, les contacts d’urgence, les alertes, le suivi volontaire, les repères terrain, les niveaux, le GPX et les conditions sont formulés comme aides de préparation non prescriptives.

## 4. Intégrations et statut réel

| Service ou catégorie | Ce qui est en place | Ce qui n’est pas encore actif |
|---|---|---|
| Météo d’itinéraire | Aperçu indicatif à partir de coordonnées/trace, alertes UI, liens officiels et radar. | Aucun engagement de disponibilité ni alerte officielle automatisée. |
| État terrain et accès | Panneau factuel, date de vérification et URL de source officielle ou locale. | Pas de synchronisation automatique avec Sépaq, Parcs Canada ou autres opérateurs. |
| Google Maps / Apple Plans | Import de coordonnées depuis des liens et ouverture de l’application de cartes. | Pas de géocodage ou de synchronisation propriétaire automatique. |
| Strava / Garmin | Échange GPX contrôlé, liens/profils et consentements révocables préparés. | OAuth réel et synchronisation d’activités nécessitent les identifiants développeur et l’autorisation des plateformes. |
| Apple Health / Health Connect | Consentements et parcours produit préparés pour l’import volontaire d’activités terminées. | Nécessite une application native ou un wrapper mobile, les entitlements concernés et la validation sur appareils réels. |
| Balises satellite | Consentements et cas d’usage de check-in préparés pour inReach, ZOLEO et SPOT. | Nécessite une API partenaire ou un accord fournisseur ; aucune alerte de secours satellite n’est active. |
| Stripe | Fondations Stripe et dépendance serveur ajoutées. | Le bac à sable doit être réclamé dans les réglages du projet ; le parcours marchand complet, les produits, Checkout, webhooks, Connect et la conformité restent à terminer. |
| Réseaux sociaux | Liens de profil et partage manuel pris en charge. | Pas de publication automatique ni d’import social natif. |
| Notifications externes | Préférences par type et notifications in-app disponibles. | E-mail, SMS, push externe et rappels transactionnels ne sont pas activés sans fournisseur et consentement. |

## 5. Actions restantes de configuration

### 5.1. Priorité haute avant ouverture au public

| Action | Pourquoi elle est nécessaire | Responsable attendu |
|---|---|---|
| Réclamer et configurer le bac à sable Stripe | Activer le test de paiement, puis confirmer la chaîne Checkout/webhooks avant toute sortie payante. | Propriétaire du projet et responsable financier. |
| Préparer les documents juridiques finaux | Faire relire CGU, confidentialité, responsabilité, annulation, consentement de localisation et conditions guide par un professionnel qualifié. | Conseil juridique canadien. |
| Définir la politique guide | Préciser validation des qualifications, assurance, politique de remboursement et règles des sorties guidées payantes. | Exploitation, juridique et assurance. |
| Configurer un domaine, e-mail support et politiques publiques | Donner un point de contact clair, publier les politiques et préparer le support utilisateur. | Propriétaire produit. |
| Recette métier avec comptes réels | Vérifier un organisateur, un coorganisateur, un participant, un administrateur et un scénario d’annulation sur données non illustratives. | Équipe produit/QA. |

### 5.2. Intégrations à activer seulement si elles servent le lancement

Pour Strava, il faut créer une application développeur, déclarer l’URL de retour du domaine publié, fournir les identifiants OAuth de manière sécurisée et valider une révocation réelle. Pour Garmin Health et les balises satellite, il faut d’abord obtenir l’accès partenaire. Pour Apple Health et Health Connect, il faut choisir une stratégie native iOS/Android, par exemple un wrapper Capacitor ou une application dédiée, puis effectuer les validations sur appareils physiques.

Les notifications externes ne doivent être activées qu’après le choix d’un fournisseur d’e-mail, SMS ou push, la mise en place des consentements et une définition claire des scénarios de rappel. Les notifications in-app déjà publiées permettent de lancer le produit sans envoyer de message extérieur automatique.

### 5.3. Configuration produit et contenu à compléter

La base applicative fonctionne avec des contenus illustratifs géographiquement cohérents. Avant l’ouverture publique, il faut compléter les profils, les sorties réelles, les images dont les droits sont confirmés, les sources terrain officielles et les informations de facilités réellement vérifiées. Les points d’eau, abris, stationnements, prévisions, réseau et accès doivent être révisés par l’organisation de chaque sortie ; TrailConnect ne doit pas les présenter comme des garanties.

Les paramètres administratifs doivent être revus : politique de modération, seuils de signalement, accès des administrateurs, politique de bannissement, niveaux de confiance, conditions des sorties guidées, langue par défaut, fuseau horaire par défaut, calendrier de rappels et visibilité des profils. Le système existe ; ce sont les décisions d’exploitation qui restent à fixer.

## 6. Éléments qui restent à développer ou à décider

Les éléments suivants ne doivent pas être confondus avec des fonctionnalités actives. Ils constituent une feuille de route possible après la recette métier et les choix de conformité.

| Priorité suggérée | Élément | Décision ou développement requis |
|---|---|---|
| P1 | Paiement de sorties guidées de bout en bout | Définir le modèle économique, les remboursements, les taxes, les produits Stripe, Checkout, webhooks et éventuellement Stripe Connect. |
| P1 | OAuth réel Strava | Enregistrer l’application, obtenir les clés, gérer la révocation et délimiter les données importées/exportées. |
| P1 | Notifications e-mail/SMS/push | Choisir le fournisseur, définir les consentements, les préférences et les règles anti-spam. |
| P1 | Synchronisation terrain officielle | Négocier ou développer des connecteurs de sources autorisées plutôt que de déduire un statut de sentier. |
| P2 | Application mobile native ou wrapper | Donner accès encadré à Apple Health, Health Connect, notifications push et fonctionnalités système plus complètes. |
| P2 | Stories éphémères | Concevoir les règles de modération, rétention, confidentialité et stockage avant d’ajouter ce module social. |
| P2 | AllTrails / Garmin / satellite natifs | Valider les droits d’API, les partenariats et la valeur réelle avant toute synchronisation. |
| P2 | Prévisualisation focalisée double format | Afficher simultanément le résultat mobile et desktop avant sauvegarde du point focal. |
| P2 | Détection ou suggestion focale assistée | Proposer un point d’intérêt automatique, toujours révocable et modifiable par l’organisation. |
| P3 | Optimisation continue des performances | Ajouter une mesure réelle de LCP, INP, erreurs client et comportement réseau sur le site publié. |

## 7. Points de vigilance techniques

La suite automatisée est solide pour les contrats et les composants, mais elle ne remplace pas une recette métier authentifiée avec de vrais comptes, un navigateur iOS, un appareil Android et une configuration Stripe réelle. Les fonctions qui dépendent de fournisseurs externes doivent être testées avec leurs environnements sandbox avant tout passage en production.

Le build est actuellement sain et les écrans lourds sont différés. Il faut toutefois surveiller la taille des paquets lors de l’ajout de nouveaux modules, notamment de bibliothèques cartographiques, de médias ou de SDK externes. Les dépendances de développement émettent un avertissement de fraîcheur concernant `baseline-browser-mapping` ; cet avertissement n’empêche ni le build ni le fonctionnement, mais une mise à jour peut être planifiée lors d’un cycle de maintenance.

Le niveau de sécurité produit dépend aussi de décisions opérationnelles : modération réactive, contrôle des sorties guidées, gestion des signalements, documentation juridique, surveillance des tâches planifiées, support utilisateur et gestion stricte des accès administrateur. La plateforme fournit les mécanismes ; elle ne remplace pas l’exploitation humaine.

## 8. Conclusion opérationnelle

TrailConnect dispose d’un socle fonctionnel étendu : marketplace de sorties, matching, logistique collective, préparation Jour J, confiance factuelle, communauté, administration, contenu bilingue et optimisation mobile. Les modules les plus différenciants — covoiturage avec réservations, politique de niveau hybride, fiche Jour J hors connexion, repères terrain, plan B, alternatives de dates, versionnage et coordination — sont publiés et validés.

La prochaine décision recommandée est de choisir le mode de lancement : **communauté gratuite avec coordination complète**, ou **marketplace de sorties guidées payantes**. Le premier peut s’appuyer immédiatement sur les notifications in-app et les parcours existants. Le second nécessite de terminer Stripe, les politiques financières, la conformité guide et les tests de paiement avant d’accepter une transaction réelle.
