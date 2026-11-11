# TrailConnect — Dossier fonctionnel et technique

**Version documentée :** état du projet `hiking-social-app` au 30 août 2026.  
**Positionnement :** plateforme canadienne mobile-first de découverte, préparation et coordination de randonnées de groupe, à mi-chemin entre une marketplace d’organisateurs et un réseau social outdoor.

> TrailConnect privilégie l’opérabilité de la sortie avant la croissance sociale : trouver une activité, comprendre son contexte, préparer son départ, coordonner le groupe et garder une trace utile après la sortie.

## 1. Ce qui est livré

TrailConnect est une application web React/Express avec authentification, base de données, stockage de médias, API typée et interface bilingue français/anglais. L’interface est conçue d’abord pour les écrans mobiles, avec une attention particulière portée aux largeurs de 320, 375 et 390 pixels, puis adaptée aux écrans de bureau.

Le dernier checkpoint publié indiquait **273 tests réussis sur 56 fichiers**, ainsi qu’une vérification TypeScript et un build de production réussis. Lors de la vérification locale la plus récente, `pnpm run check` a réussi, mais la suite courante a obtenu **260 tests réussis et 13 échecs sur 56 fichiers**, avec une erreur jsdom non gérée. Les échecs concernent l’état local en cours d’édition : des mocks UI ne déclarent pas encore une procédure de covoiturage attendue, et un test de profil appelle `scrollIntoView`, absent de jsdom. Cette situation doit être corrigée avant un nouveau checkpoint ou une nouvelle publication. Le build de production a été rejoué séparément et réussit. Vite signale toutefois quelques chunks JavaScript supérieurs à 500 kB après minification ; le lazy loading est déjà en place, mais une optimisation supplémentaire du découpage des vendors reste possible. Le build doit être rejoué après toute correction des tests.

| Domaine | Fonctionnement actuel | État documenté |
|---|---|---|
| Découverte | Accueil, exploration, cartes, sorties illustratives canadiennes, filtres avancés et ouverture d’une fiche | Livré |
| Création de sortie | Formulaire en quatre étapes avec sauvegarde locale du brouillon | Livré |
| Parcours | GPX/KML facultatif, dessin manuel, aller-retour, liens Maps, métriques indicatives et zones d’attention | Livré |
| Niveau | Recommandation indicative selon métriques et contexte, avec choix manuel possible | Livré |
| Logistique | Rendez-vous, météo, facilités, checklist, covoiturage, préparation et mode hors ligne | Livré en grande partie |
| Organisation | Cockpit organisateur, demandes, participants, liste d’attente, présence et rôles | Livré |
| Social | Profils publics, recherche, amis, messages directs, groupes et modération | Livré |
| Administration | Utilisateurs, événements, contenus, réclamations, réglages et intégrations | Livré |
| AllTrails | Conservation et ouverture d’un lien source vérifié | Livré |
| Import automatique AllTrails | Lecture automatisée de la fiche à partir d’un lien | Reporté, API partenaire nécessaire |
| Édition globale | Plusieurs éditeurs existent, mais l’audit final de visibilité et l’édition covoiturage restent à terminer | À compléter |

## 2. Prérequis

### Développement local

| Élément | Recommandation |
|---|---|
| Système | Linux, macOS ou Windows avec un terminal compatible |
| Node.js | Version 22 ou supérieure |
| Gestionnaire de paquets | `pnpm` 10.x, conforme au `packageManager` du projet |
| Base de données | MySQL ou TiDB accessible depuis l’environnement local |
| Navigateur | Chrome ou Chromium récent pour les contrôles de carte et les tests manuels |
| Stockage | Les médias utilisent le stockage Manus/S3 configuré par le projet |
| OAuth | Un accès Manus OAuth configuré pour le domaine local ou l’environnement de test |

Le projet n’a pas besoin d’un serveur Python, d’un serveur Apache ou de PHP. Le serveur Node gère Express, le pont Vite en développement et l’API tRPC.

### Services externes utilisés

La base de fonctionnement est assurée par Manus OAuth, la base MySQL/TiDB, le stockage Manus/S3 et le service cartographique configuré par le projet. Les fonctions Stripe sont préparées mais ne doivent pas être considérées comme actives tant que l’environnement Stripe de test n’a pas été réclamé et vérifié.

Le lien AllTrails n’est pas un accès automatique aux données AllTrails. L’application stocke une URL source validée et l’ouvre dans un nouvel onglet ou via le navigateur mobile. L’import automatisé exige une autorisation et une API partenaire qui ne sont pas présentes dans le projet.

## 3. Récupérer le code

Deux méthodes sont possibles.

### Depuis Manus

Dans l’interface de gestion du projet, utilisez le menu à trois points puis **Download as ZIP**. Cette méthode est la plus simple si vous souhaitez récupérer exactement le projet géré par Manus.

### Depuis l’archive remise

Décompressez `trailconnect-project.zip` dans un dossier de travail. L’archive exclut `node_modules`, `.git`, les logs locaux et les artefacts de build afin de réduire sa taille. Les dépendances seront réinstallées avec `pnpm install`.

Dans Visual Studio Code, ouvrez ensuite le dossier qui contient `package.json`, et non un sous-dossier `client` ou `server` :

```bash
cd chemin/vers/hiking-social-app
code .
```

## 4. Installation locale pas à pas

### Étape 1 — Installer les dépendances

```bash
pnpm install
```

Le fichier `pnpm-lock.yaml` doit être conservé afin de reproduire les versions utilisées lors du développement. Évitez de supprimer ou de régénérer le lockfile sans raison.

### Étape 2 — Configurer les variables d’environnement

Créez un fichier `.env` à la racine, sans le commiter. Voir `.env.example` pour la liste complète et commentée des variables.

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=mysql://utilisateur:mot_de_passe@hote:3306/trailconnect
JWT_SECRET=remplacer_par_une_valeur_aleatoire_longue

GOOGLE_CLIENT_ID=votre_identifiant_oauth_google
GOOGLE_CLIENT_SECRET=votre_secret_oauth_google
OWNER_EXTERNAL_ID=votre_identifiant_proprietaire

UPLOAD_DIR=./var/uploads
```

Variables optionnelles selon les modules activés : `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAP_ID`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `VITE_STRIPE_PUBLISHABLE_KEY`.

Ne copiez jamais des secrets dans un composant React, dans `client/public`, dans un commit Git ou dans une capture d’écran. Les variables préfixées `VITE_` sont potentiellement exposées au navigateur ; elles ne doivent donc jamais contenir une clé secrète serveur.

### Étape 3 — Préparer la base de données

Le script du projet est :

```bash
pnpm run db:push
```

Il exécute la génération Drizzle puis l’application des migrations. Pour une base déjà utilisée en production, faites une sauvegarde et examinez toujours le SQL généré avant de l’appliquer. Le workflow recommandé est : modifier `drizzle/schema.ts`, générer la migration, relire le fichier SQL, appliquer la migration dans l’environnement visé, puis vérifier le schéma.

Dans l’environnement Manus, les migrations appliquées vont jusqu’à la série 0050 selon l’historique du projet. L’archive peut contenir les snapshots Drizzle sans contenir l’état distant de la base ; les données ne sont pas transportées par le ZIP.

### Étape 4 — Vérifier le code

```bash
pnpm run check
pnpm test
pnpm run build
```

`pnpm run check` lance TypeScript sans émission de fichiers. `pnpm test` exécute Vitest. La vérification locale du 30 août 2026 a détecté 13 échecs sur 273 tests après des modifications locales non checkpointées ; le détail est conservé dans `todo.md`. `pnpm run build` construit le frontend Vite et le serveur Node avec esbuild.

### Étape 5 — Démarrer l’application

```bash
pnpm run dev
```

Ouvrez ensuite `http://localhost:3000`. Le port est configurable avec `PORT`; il ne faut pas le coder en dur dans les modules applicatifs.

## 5. Prise en main dans Visual Studio Code

Le dossier racine contient les quatre zones principales suivantes :

| Dossier | Responsabilité |
|---|---|
| `client/src` | Pages, composants, contexte, navigation et styles de l’interface |
| `server` | Procédures tRPC, accès aux données, authentification et services serveur |
| `drizzle` | Schéma MySQL/TiDB, relations et métadonnées de migrations |
| `shared` | Logique métier utilisable côté serveur et côté navigateur |

Les fichiers les plus importants sont `client/src/pages/Home.tsx` pour l’orchestration principale, `client/src/pages/CreateEventPage.tsx` pour la création, `client/src/pages/MyOutingsPage.tsx` pour l’espace des sorties, `client/src/pages/AccountProfilePage.tsx` pour le compte, `client/src/pages/SocialCommunityPage.tsx` pour la communauté, `server/hikingRouter.ts` pour les procédures randonnée, `server/db.ts` pour la couche données et `drizzle/schema.ts` pour le modèle persistant.

Les composants réutilisables couvrent notamment les cartes, les cartes Google Maps, le cockpit organisateur, le covoiturage, les panneaux météo, les checklists, le parcours manuel, le dossier Jour J, les repères terrain, les profils et la messagerie.

## 6. Parcours utilisateur détaillés

### 6.1 Authentification

L’utilisateur ouvre le portail Manus OAuth depuis une action de connexion. Le retour arrive sur `/api/oauth/callback`, qui crée la session. Le contexte serveur reconstruit ensuite l’utilisateur à chaque appel tRPC. Les procédures réservées utilisent `protectedProcedure` et refusent l’accès lorsqu’aucune session n’est disponible.

Le frontend utilise `useAuth()` et les procédures `auth.me` et `auth.logout`. Il ne manipule pas directement les cookies.

### 6.2 Découvrir une sortie

La page d’accueil présente une sélection de sorties et des actions d’exploration. La vue carte affiche des marqueurs identifiables ; la sélection d’un marqueur montre un aperçu textuel et ouvre la fiche correspondante. Le filtre de période est réglé par défaut sur les sorties à venir, avec une option pour afficher les sorties passées.

Les filtres couvrent notamment la difficulté, la distance, le dénivelé, la durée, la capacité, le covoiturage, le type de sortie, le mode de réservation et la période. Les sorties illustratives se situent au Canada, particulièrement autour de Montréal, au Québec et dans le nord-est américain accessible depuis cette région.

### 6.3 Créer une sortie

La création se déroule en quatre étapes : **Essentiels**, **Parcours et niveau**, **Logistique**, puis **Révision**. Les boutons `Précédent`, `Suivant`, le bouton `Retour` et les onglets d’étape permettent de naviguer sur ordinateur comme sur mobile.

Les champs obligatoires sont le titre, le lieu, la date et une description d’au moins 20 caractères. La trace GPX/KML, le lien AllTrails, la couverture, les coordonnées précises, les facilités, les consignes et la plupart des informations de préparation sont facultatifs.

Le brouillon est sauvegardé localement dans le navigateur sous la clé `trailconnect-create-outing-draft`. Cette sauvegarde améliore la reprise après une interruption, mais elle ne remplace pas une sauvegarde serveur et ne doit pas être utilisée pour transporter des données sensibles.

#### Parcours et niveau

L’organisateur peut importer un GPX ou un KML. Le fichier est envoyé au stockage, et un GPX lisible peut préremplir la distance, le dénivelé et le point de départ. Ces mesures sont indicatives et doivent être vérifiées.

Sans fichier, l’organisateur peut dessiner un parcours sur la carte, activer un mode aller-retour, lire des coordonnées depuis un lien compatible Google Maps ou Apple Plans et ajouter des zones d’attention, de danger, d’accès ou de navigation. Le lien et les métriques extraites restent soumis à vérification humaine.

La difficulté recommandée est calculée à partir de la distance, du dénivelé, de la durée, du type de sortie, du terrain, de la technicité, de l’exposition, de la navigation et de l’état déclaré du parcours. Le choix est une aide de préparation, pas une certification. L’organisateur peut conserver la recommandation ou sélectionner manuellement un autre niveau.

La politique de niveau est par défaut déclarative. Une sortie peut aussi demander une confirmation ou une revue par l’organisateur. Une exception documentée est prévue pour éviter un blocage arbitraire ; cela ne constitue pas une promesse de sécurité ou d’adéquation.

#### Logistique et préparation

L’organisateur peut renseigner un point de rendez-vous, des consignes d’accès, un contexte pour les participants, une politique d’annulation ou de report, les facilités connues et la date de dernière vérification. Les statuts disponibles sont `Disponible`, `Limité`, `Indisponible` et `À confirmer`.

Les points d’eau, abris et stationnements peuvent être ajoutés avec nom, note, statut, coordonnées GPS et date de vérification. Les repères existants sont éditables et supprimables par les rôles autorisés.

La checklist propose des éléments de sac selon les métriques, la saison et la météo. L’organisateur peut accepter, modifier ou retirer ces suggestions. Les formulations restent indicatives et non prescriptives.

#### Couverture

Une image JPG, PNG ou WebP peut être téléversée. Le projet prépare une variante adaptée à l’affichage et permet de choisir un point focal afin que le sujet principal reste visible dans les cartes mobiles et les bannières de bureau.

### 6.4 Consulter et rejoindre une sortie

La fiche est structurée en deux niveaux. Le premier écran contient la couverture, le titre, le lieu, la date, les métriques, le point de rendez-vous, les places, la météo indicative, les repères de confiance et les actions essentielles. Le contenu long est placé dans un **Dossier de sortie** repliable.

Le dossier donne accès au parcours, aux conditions, aux facilités, à la préparation, au covoiturage, à la sécurité, au chat, au mode hors ligne, au Jour J et aux débriefs. Les raccourcis « Départ partagé », « Logistique », « Météo », « Parcours » et autres cartes ouvrent un module réel ou indiquent clairement quand une information manque.

Le bouton de participation dépend de l’état serveur. Après une candidature, l’utilisateur voit `En attente de validation` dans la fiche et dans **Mes sorties**. Une nouvelle candidature n’est pas recréée si une participation ou une demande existe déjà. L’organisateur peut accepter ou refuser lorsqu’une validation est nécessaire.

L’organisateur est considéré comme participant à sa propre sortie et ne reçoit pas un bouton `Participer` inutile. La fiche peut être fermée par son bouton persistant, par la touche Échap sur ordinateur ou par le retour mobile.

### 6.5 Cockpit organisateur

Le bouton fixe **Gérer / Manage** ouvre une interface séparée qui évite de parcourir tout le dossier. Elle rassemble en priorité la modification des essentiels, l’annulation de la sortie, les candidatures, les participants confirmés et la liste d’attente.

| Zone | Actions |
|---|---|
| Essentiels | Modifier titre, description, lieu, date, capacité et paramètres principaux selon les droits |
| Demandes | Accepter ou refuser une candidature, avec note d’exception lorsqu’elle est requise |
| Confirmés | Consulter les profils publics, pointer la présence, déplacer vers l’attente ou retirer un participant |
| Liste d’attente | Proposer une place temporaire, confirmer, retirer et suivre le statut |
| Coordination | Accéder aux parcours, préparation, météo, responsabilités, décisions Jour J et historique |
| Cycle de vie | Annuler la sortie avec information des personnes concernées |

Les décisions sont contrôlées côté serveur. Les notifications et les réservations de covoiturage sont mises à jour lorsque cela est nécessaire.

### 6.6 Covoiturage

Lorsqu’une sortie autorise le covoiturage, le module permet au conducteur de proposer une offre avec un lieu de départ, une heure facultative, un nombre total de places, les places disponibles et une note.

Un participant peut demander une ou plusieurs places. Le conducteur voit les demandes en attente et peut les accepter, les refuser ou retirer un passager confirmé. Les capacités restantes et les statuts sont recalculés. Le retrait de l’offre libère les réservations et notifie les personnes concernées.

L’édition directe d’une offre existante — changement du lieu, de l’horaire ou du nombre de places sans suppression — fait partie des travaux restant à valider dans la présente livraison. Le backend contient des éléments préparatoires, mais l’interface et la couverture de recette doivent être considérées comme incomplètes tant qu’elles n’ont pas été vérifiées par un test et un checkpoint.

### 6.7 Météo et accès

La météo de sortie est une information indicative liée à la date et, lorsque disponible, aux coordonnées ou aux points représentatifs du parcours. La page peut présenter une plage de température, les conditions principales, une source régionale officielle, une source locale épinglée par l’organisateur, une mise à jour importante et des liens complémentaires.

Les données météo ne sont ni une alerte officielle, ni une garantie de sécurité, ni une validation de l’accessibilité du parcours. Les conditions réelles, les fermetures, les horaires et les consignes des autorités doivent être vérifiés séparément.

Le radar d’accès rassemble des informations sur l’état du sentier, l’accès, le stationnement, les permis et les fermetures, avec une source HTTPS, une date de vérification et un statut `ouvert`, `prudence`, `restreint` ou `fermé`.

### 6.8 Fiche Jour J et mode hors ligne

La fiche Jour J rassemble le rendez-vous, l’itinéraire opérationnel, le plan B, les responsabilités, les décisions à fenêtre courte, la météo, le matériel, les contacts d’urgence et les informations utiles. L’itinéraire peut inclure une image ou un schéma. Les modifications sont historisées.

Les participants peuvent confirmer qu’ils ont lu la dernière version. Une nouvelle version produit une notification in-app ciblée. Un pack hors ligne peut être préparé avec les informations essentielles de la sortie, la checklist, la trace disponible et les repères de sécurité. Le partage ou l’impression dépend des capacités du navigateur et du mobile.

Le bouton SOS et les informations d’urgence ne promettent pas une intervention automatique. En situation réelle, il faut utiliser les services d’urgence appropriés et les procédures locales.

### 6.9 Mes sorties

**Mes sorties** distingue les activités à préparer et les sorties passées à débriefer. Les sorties proches sont mises en évidence, avec une prochaine action lisible : vérifier le rendez-vous, consulter la météo, finaliser la préparation, examiner le covoiturage ou attendre la décision de l’organisateur.

La liste affiche aussi les responsabilités attribuées à l’utilisateur, les nouveaux rôles, l’état de préparation et le statut de participation. Les sorties du jour reçoivent un traitement visuel distinct.

### 6.10 Profils et confiance

Chaque membre possède un profil public consultable par identifiant ou nom selon les réglages de visibilité. Un identifiant public partageable permet l’ouverture par lien, le partage système et la génération d’un QR code.

Le profil peut contenir avatar, biographie, langues, régions, réalisations, liens, préférences de contact et informations de confiance. Le changement d’avatar passe par le stockage puis invalide les données de profil afin d’actualiser l’image immédiatement.

Les signaux de confiance sont factuels : téléphone vérifié lorsqu’il existe, statut guide, historique de sorties, présences enregistrées et fiabilité de participation. Ils ne garantissent ni la compétence, ni l’adéquation, ni la sécurité d’une sortie.

### 6.11 Amis, messages et blocage

La recherche de membres fonctionne dès le premier caractère saisi et peut afficher les profils publics dès l’ouverture. Une demande d’amitié peut comporter une note facultative. Le destinataire accepte ou refuse depuis les notifications ; l’historique garde les décisions récentes.

La messagerie directe est possible lorsque le destinataire est contactable et qu’aucun blocage ne s’applique. Chaque membre peut choisir `Ouvert à tous`, `Amis uniquement` ou `Personne`. Les utilisateurs peuvent bloquer et signaler un membre. Les contrôles sont appliqués côté serveur, et les écrans prévoient les états vides et les erreurs.

### 6.12 Groupes communautaires

La création de groupe est réservée aux utilisateurs connectés. Le créateur devient propriétaire et peut gérer les rôles, les invitations, la visibilité et le contenu. Les noms doivent être uniques ; une collision renvoie une erreur compréhensible.

Les niveaux de visibilité incluent public, privé et sur invitation. Un propriétaire ou administrateur autorisé peut modifier le nom, la description, le lieu, le lien, la couverture, les publications et les membres. Il peut promouvoir ou rétrograder des administrateurs et supprimer le groupe après confirmation.

Les publications peuvent contenir du texte, un lien et une image. Les discussions de groupe incluent signalement et modération. Les invitations invalidées par la suppression du groupe ou le retrait d’un rôle doivent afficher un état expiré ou non valide plutôt que rester silencieuses.

### 6.13 Notifications

Les notifications couvrent les demandes de participation, décisions organisateur, demandes d’amitié, rôles attribués, messages, rappels et mises à jour météo ou Jour J. Le badge rouge du profil indique les alertes non lues. L’utilisateur peut lire une alerte individuellement ou tout marquer comme lu ; une confirmation visuelle est affichée.

Les notifications sont in-app. Les rappels e-mail ou push externes restent soumis à un fournisseur et à un consentement explicite.

### 6.14 Intégrations outdoor et consentements

L’application prépare des connexions avec des services outdoor comme AllTrails ou Strava sans lire de données automatiquement. Une interface permet de préparer, consulter et révoquer les consentements proposés. La révocation supprime le consentement local ; elle ne déconnecte pas un compte fournisseur qui n’a pas été réellement connecté.

### 6.15 Administration

Les procédures d’administration sont protégées par le rôle serveur approprié. Le tableau de bord permet de consulter et gérer les utilisateurs, événements, publications, signalements, réclamations, guides et réglages globaux.

Les états utilisateur comprennent notamment actif, suspendu et banni. Les contenus peuvent être modérés. Les réglages couvrent la localisation canadienne, les unités, les notifications et les intégrations autorisées. Chaque action sensible doit rester contrôlée côté serveur, même si le bouton est masqué dans l’interface.

## 7. Architecture technique

### Frontend

Le frontend utilise React 19, Vite, Tailwind CSS 4, Wouter pour la navigation, Lucide pour les icônes, TanStack React Query via tRPC et des composants Radix/shadcn adaptés au design TrailConnect. Les écrans lourds sont chargés en différé avec `React.lazy` et `Suspense` afin de réduire le bundle initial.

`Home.tsx` orchestre la navigation principale, la fiche de sortie, la modale de création, le dossier de sortie et le cockpit. Les pages spécialisées restent dans `client/src/pages`, et les modules de parcours ou de coordination dans `client/src/components`.

### Backend

Le backend est un serveur Express 4 lancé par `server/_core/index.ts`. Les appels métier passent sous `/api/trpc`. Les contrats sont déclarés dans `server/hikingRouter.ts` et les autres routeurs, validés par Zod, puis exécutés par des helpers dans `server/db.ts`.

Les procédures sont généralement publiques pour la consultation et protégées pour les actions d’un utilisateur connecté. Les procédures d’administration utilisent une protection supplémentaire. Les autorisations ne reposent pas uniquement sur l’affichage ou le masquage d’un bouton frontend.

### Base de données

Drizzle ORM décrit le schéma dans `drizzle/schema.ts`. Les principales familles de tables couvrent :

| Famille | Exemples de données |
|---|---|
| Identité | utilisateurs, profil guide, préférences hiker, contacts d’urgence |
| Sorties | événements, participants, demandes, séries, options de date |
| Parcours | trace, historique, repères terrain, zones d’attention, accès |
| Logistique | rendez-vous, offres et réservations de covoiturage, responsabilités |
| Préparation | checklists, matériel participant, passeport de préparation, Jour J |
| Météo | mises à jour, accusés de lecture, sources locales |
| Social | publications, réactions, abonnements, amitiés, cercles |
| Groupes | groupes, membres, invitations, publications, messages |
| Sécurité | consentements, partages de position, check-ins, signalements |
| Administration | réglages, actions de modération, réclamations |

Les dates métier sont stockées comme timestamps UTC et converties dans le fuseau local uniquement à l’affichage.

### Stockage des médias

Les images, traces et autres fichiers ne doivent pas être stockés en BLOB dans la base. Le serveur utilise les helpers de stockage Manus/S3. La base conserve les références et métadonnées utiles ; les octets restent dans le stockage.

Les fichiers statiques lourds ne doivent pas être ajoutés à `client/public` ou `client/src/assets`. Pour un asset de déploiement, utilisez le stockage webdev et référencez l’URL retournée.

## 8. API métier principale

Les procédures suivantes illustrent les contrats disponibles. Elles ne remplacent pas la lecture des schémas et des validations.

| Domaine | Procédures représentatives |
|---|---|
| Événements | `events.search`, `events.detail`, `events.create`, `events.update`, `events.cancel`, `events.join` |
| Parcours | `events.updateManualRoute`, `events.updateCoverFocalPoint`, `events.terrainLandmarks`, `events.updateTerrainLandmark` |
| Météo | `events.routeOutlook`, `events.setLocalWeatherSource`, `events.publishWeatherUpdate`, `events.acknowledgeWeatherUpdate` |
| Participants | `events.participants`, `events.manageParticipant`, `events.checkIn`, `events.offerWaitlistPlace` |
| Covoiturage | liste, création, réservation, décision, retrait, retrait de l’offre et procédure de mise à jour préparée |
| Social | `social.profile`, recherche, amitié, suivi, blocage, signalement et messages |
| Groupes | détail, création, mise à jour, suppression, invitations, rôles, publications et modération |
| Compte | préférences, notifications, suppression différée du profil et annulation de suppression |
| Administration | utilisateurs, événements, guides, contenus, signalements, réglages et réclamations |

Les validations centrales se trouvent dans `server/hikingValidation.ts`. Les contraintes importantes comprennent la longueur minimale de description, les plages de métriques, les coordonnées GPS valides, la cohérence des places de covoiturage et les URL HTTPS autorisées.

## 9. Tests et contrôles

Les tests Vitest sont répartis entre serveur, logique partagée, composants et pages. La dernière exécution locale a produit 260 tests réussis et 13 échecs sur 56 fichiers. Le build de production réussit, avec un avertissement non bloquant de chunks supérieurs à 500 kB. Les couvertures existantes incluent notamment :

| Catégorie de test | Vérifications |
|---|---|
| Contrats serveur | Authentification, droits, création, participation, modération et notifications |
| Métier partagé | GPX, difficulté, matching, météo de confort, préparation, sécurité et offline |
| Composants | Covoiturage, cockpit, météo, carte, parcours manuel, QR code, checklists et repères |
| Pages | Explorer, fiche sortie, Mes sorties, profil, groupes, marketplace, administration |
| Accessibilité | Focus, libellés, annonces, états vides et tailles tactiles |
| Responsive | Confinement horizontal, overlays, panneaux et modales à plusieurs largeurs |

Commandes de vérification :

```bash
pnpm run check
pnpm test
pnpm run build
```

Après toute modification du schéma, du backend ou d’une fonctionnalité sensible, ajoutez ou mettez à jour un test Vitest avant de considérer le travail comme terminé. Les captures navigateur ne remplacent pas les tests unitaires et d’intégration.

## 10. Déploiement

### Déploiement recommandé : Manus

Le projet est déjà prévu pour l’hébergement Manus et son domaine publié. Le workflow recommandé est : vérifier le code, enregistrer un checkpoint dans l’interface de gestion, puis vérifier l’URL de production. Dans ce projet, la publication automatique est activée : l’enregistrement d’un checkpoint publie immédiatement la version correspondante.

Avant le checkpoint, vérifiez `todo.md`, exécutez `pnpm run check`, `pnpm test` et `pnpm run build`, puis contrôlez les parcours critiques sur mobile et bureau. Ne publiez pas une version si le serveur ou la console navigateur présente une erreur active.

### Déploiement hors Manus

Un déploiement externe sur Railway, Render, Vercel ou Netlify peut demander des adaptations du serveur Express, de l’authentification OAuth, du stockage et du routage. Manus fournit déjà l’hébergement intégré, les domaines personnalisés et la gestion des secrets ; un hébergeur externe n’est donc pas nécessaire pour exploiter la version actuelle.

Si vous choisissez un autre hébergeur, utilisez au minimum :

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
pnpm start
```

Configurez les mêmes variables d’environnement, une base MySQL/TiDB persistante, le stockage S3/Manus compatible, les URLs de callback OAuth et un proxy HTTPS. Vérifiez également que le serveur écoute le port fourni par `PORT`.

## 11. Travaux restant à faire ailleurs

Conformément à votre demande, cette section marque clairement le travail que vous pourrez reprendre dans un autre environnement. Ces points ne doivent pas être présentés comme validés par le dernier checkpoint.

| Priorité | Travail restant | Fichiers ou services concernés | Critère de fin |
|---|---|---|---|
| Haute | Rendre le GPX définitivement facultatif dans chaque étape de création et éliminer toute validation résiduelle qui demanderait une trace | `client/src/pages/CreateEventPage.tsx`, validations et tests de création | Publier une sortie sans GPX, sans KML et sans parcours manuel ; tests FR/EN réussis |
| Haute | Finaliser l’édition directe d’une offre de covoiturage sans la supprimer | `ConfigurableCarpoolActionHub` dans `Home.tsx`, `server/db.ts`, `server/hikingRouter.ts`, validations | Modifier lieu, heure et places ; préserver ou refuser correctement les réservations ; tests conducteur/participant |
| Haute | Rendre l’accès à l’édition d’une sortie visible et immédiat depuis le cockpit | `Home.tsx`, panneau de gestion, tests UI | Un organisateur ouvre `Modifier` en haut de l’écran et sauvegarde sans parcourir le dossier |
| Moyenne | Rendre le bouton `Modifier profil` clairement visible sur la page de profil | `SocialProfilePage.tsx`, `AccountProfilePage.tsx` | L’utilisateur connecté trouve et ouvre l’édition en une action sur mobile et bureau |
| Moyenne | Ajouter des commandes directes sur la page d’un groupe créé | `SocialCommunityPage.tsx`, `GroupManagementPanel.tsx` | Le propriétaire peut renommer, changer l’image et gérer les membres sans chercher un menu caché |
| Moyenne | Vérifier que chaque entité créée expose une action `Modifier` cohérente | Sorties, groupes, profil, covoiturage, repères, checklists et Jour J | Audit manuel et tests UI avec une sortie, un groupe, un profil et une offre réelle |
| Dépendante | Import automatique AllTrails | API partenaire et serveur d’intégration | Accès contractuel autorisé, limites documentées, consentement, import contrôlé et tests de quota |
| Dépendante | Synchronisation native avec AllTrails/Strava | OAuth fournisseur, consentements, stockage et tâches de synchronisation | Compte connecté explicitement, révocation effective et absence de lecture sans consentement |
| Produit | Stories éphémères | Modèle posts/stories, stockage média, expiration et modération | Publication, expiration, signalement, suppression et contrôle de confidentialité |
| Juridique | Relecture professionnelle des CGU, responsabilités, assurance et formulations de sécurité | Documents juridiques et parcours sensibles | Validation par juriste/assureur avant exploitation commerciale |
| Exploitation | Vérifier Stripe sandbox et les règles de paiement | Compte Stripe et secrets | Sandbox réclamée, webhooks validés et politique de remboursement définie |

### Point important sur l’état du code local

Le dossier de travail contient actuellement des modifications non enregistrées dans un checkpoint, notamment autour de `carpoolUpdateSchema`, `updateCarpoolOffer`, du composant de covoiturage et de l’accès d’édition du profil. Ces modifications ne doivent pas être considérées comme publiées simplement parce qu’elles existent dans les fichiers locaux. Il faut d’abord corriger les échecs Vitest listés dans `todo.md`, relancer `pnpm run check`, `pnpm test` et `pnpm run build`, vérifier les parcours dans le navigateur, puis créer un checkpoint séparé si vous décidez de les reprendre.

## 12. Dépannage courant

| Symptôme | Vérifications |
|---|---|
| Page blanche après une navigation | Lire la console navigateur, vérifier les imports lazy et ouvrir la fiche par son URL directe |
| Impossible de se connecter | Vérifier `VITE_APP_ID`, `OAUTH_SERVER_URL`, l’URL de callback et la session OAuth |
| Erreur de base de données | Vérifier `DATABASE_URL`, la connectivité, les migrations et les droits MySQL |
| Image absente | Vérifier l’upload S3/Manus, l’URL `/manus-storage/` et les règles de stockage |
| Carte vide | Vérifier la configuration Google Maps et les coordonnées ; les fonctions non cartographiques doivent rester utilisables |
| GPX refusé | Vérifier l’extension, la taille, le stockage et la séparation entre trace facultative et champs obligatoires |
| Débordement mobile | Tester 320, 375 et 390 px, puis inspecter les overlays, `min-width`, textes longs et boutons |
| TypeScript en erreur après une validation Zod | Avec Zod 4, une base raffinée doit être étendue avec `safeExtend`, pas `extend` |
| Notification non visible | Vérifier l’identité connectée, le statut lu/non lu et l’invalidation du cache tRPC |

Les logs locaux utiles se trouvent dans `.manus-logs/`. Pour un problème de runtime, consultez en priorité `devserver.log`, `browserConsole.log` et `networkRequests.log` sans ignorer une erreur antérieure à l’action utilisateur.

## 13. Références techniques

Les références suivantes correspondent aux technologies utilisées par le projet et servent de documentation complémentaire :

1. [React — documentation officielle](https://react.dev/)
2. [Vite — documentation officielle](https://vite.dev/guide/)
3. [pnpm — documentation officielle](https://pnpm.io/motivation)
4. [TypeScript — documentation officielle](https://www.typescriptlang.org/docs/)
5. [tRPC — documentation officielle](https://trpc.io/docs)
6. [Drizzle ORM — documentation officielle](https://orm.drizzle.team/docs/overview)
7. [Vitest — documentation officielle](https://vitest.dev/guide/)
8. [Express — documentation officielle](https://expressjs.com/)
9. [Zod — documentation officielle](https://zod.dev/)
10. [MDN — Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

## 14. Commandes de référence

```bash
# Installer
pnpm install

# Développement
pnpm run dev

# TypeScript
pnpm run check

# Tests
pnpm test

# Build de production
pnpm run build

# Démarrage de production
pnpm start

# Génération et application des migrations selon le script du projet
pnpm run db:push

# Formatage
pnpm run format
```

## Conclusion

La base livrée couvre déjà le cœur de valeur TrailConnect : découverte, inscription, organisation, logistique, préparation, confiance, profils et communauté. Le travail restant le plus concret concerne la cohérence de l’édition partout dans l’interface, particulièrement l’action de modification du covoiturage et la vérification finale du caractère non bloquant du GPX. L’import automatique AllTrails, les synchronisations outdoor natives, les stories et la validation juridique restent des extensions ou dépendances externes, et ne doivent pas être activés sans les autorisations et contrôles correspondants.
