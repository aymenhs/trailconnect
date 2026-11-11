# Plan d’action — événements collectifs, social éphémère et intégrations outdoor

## Conclusion exécutive

Le constat mérite une nuance importante : **TrailConnect possède déjà une base solide de gestion collective**. L’application couvre l’inscription directe ou sur demande, la capacité, les participants, le pointage organisateur, le covoiturage, le rendez-vous, la checklist dynamique, la messagerie de groupe, les coorganisateurs et une recommandation de difficulté reliée aux caractéristiques de la sortie. Son vrai manque n’est donc pas l’absence de ces modules, mais leur passage d’une **base MVP fonctionnelle** à un **poste de pilotage collectif complet**, vérifiable et fluide.

### Décisions produit confirmées

1. **Priorité produit :** TrailConnect privilégie l’opérabilité de la sortie. Les phases P0 et P1 sont réalisées avant les stories et les intégrations sociales avancées.
2. **Politique de niveau :** le niveau reste déclaratif par défaut, mais une sortie peut exiger un niveau renforcé lorsque son organisateur le justifie par les caractéristiques renseignées. Une exception est possible, documentée par l’organisateur et visible au participant concerné.
3. **Formulation :** recommandations, niveau déclaré, compatibilité et exception sont des repères de préparation ; ils ne constituent ni une autorisation de sécurité ni une garantie d’aptitude.

Les deux écarts les plus nets sont d’une part les **stories éphémères**, qui n’existent pas encore, et d’autre part les **connexions natives** aux plateformes outdoor. Strava est un candidat réaliste grâce à son API publique sur consentement. AllTrails doit être traité différemment : les documents publics consultés décrivent des intégrations grand public et un programme d’affiliation, mais ne présentent pas une API développeur publique comparable à celle de Strava. Une intégration AllTrails profonde doit donc être conditionnée à un accord partenaire explicite, et jamais reposer sur du scraping.[1] [2] [3] [4]

> **Recommandation centrale :** faire de TrailConnect le système d’exploitation de la sortie de groupe — avant, pendant et après — puis connecter Strava pour enrichir le récit et la confiance. Les stories doivent soutenir cette boucle sociale, non détourner l’effort produit de la logistique et de la sécurité.

## État de la couverture actuelle

| Domaine | Déjà présent dans TrailConnect | Écart restant à traiter | Priorité |
| --- | --- | --- | --- |
| Inscription collective | Inscription, demande d’approbation, capacité, rôles, participants, annulation et pointage organisateur. | Liste d’attente, expiration de réservation, présence opérationnelle et vues organisateur plus riches. | Très haute |
| Covoiturage | Offres de places, lieu de départ, nombre de places, rendez-vous et coordination de groupe. | Réservation de siège, liste d’attente covoiturage, demandes conducteur-passager, visibilité précise limitée et statut de trajet. | Très haute |
| Checklist | Checklist dynamique, dossier hors ligne, matériel et consignes de préparation. | Modèles par type de sortie, validation individuelle « préparé », éléments obligatoires et relance ciblée in-app. | Haute |
| Niveau / confiance | Recommandation de difficulté, métriques GPX, préférences hiker, matching expliqué et signaux de confiance. | Conditions d’éligibilité contrôlables, justification d’exception, niveau requis par l’organisateur et traçabilité des confirmations. | Très haute |
| Social | Publications, photos limitées, abonnements, réactions, profils, groupes et discussions. | Stories de 24 h, vues, confidentialité fine et modération éphémère. | Moyenne |
| Strava | Réglage d’administration préparatoire uniquement. | OAuth, consentement, import choisi par l’utilisateur, synchronisation et déconnexion. | Haute |
| AllTrails | Réglage préparatoire et possibilité de liens/GPX dans le produit. | Partenariat officiel ou, à défaut, liens profonds et import de fichiers fournis par l’utilisateur. | Moyenne |

## Axe 1 — Faire de la gestion collective un différenciateur tangible

### Phase A — Dossier opérationnel de sortie

Cette phase doit transformer la fiche actuelle en espace de coordination. L’organisateur dispose d’un tableau unique : participants confirmés, demandes en attente, places restantes, liste d’attente, coorganisateurs, état de préparation et pointage de départ. Le participant voit uniquement ses prochaines actions : accepter les conditions de la sortie, confirmer son niveau, compléter sa checklist, réserver ou proposer un covoiturage, puis signaler qu’il est prêt.

| Fonction à ajouter ou renforcer | Résultat produit attendu | Garde-fou |
| --- | --- | --- |
| Liste d’attente ordonnée | Une place libérée peut être proposée à la première personne éligible. | Confirmation limitée dans le temps ; aucun basculement silencieux. |
| Réservation de siège covoiturage | Un passager demande une place, le conducteur confirme, les sièges sont décomptés. | Adresse exacte masquée jusqu’à acceptation mutuelle ; aucun suivi de trajet implicite. |
| Checklist par sortie et par participant | Chaque personne confirme les éléments pertinents : eau, vêtements, traction, lampe, etc. | Formulation de préparation, jamais de garantie de sécurité. |
| Validation de niveau | L’organisateur définit les prérequis ; le hiker confirme son expérience et l’écart est visible. | Recommandation automatique explicable ; une décision humaine reste possible et justifiée. |
| Tableau de présence | États « confirmé », « prêt », « arrivé », « absent », « check-in ». | Données minimales, audit organisateur et rétention limitée. |

### Phase B — Gestion des exceptions

Les cas qui font réellement la différence sur une sortie de groupe doivent être couverts : annulation, météo défavorable indiquée, modification d’horaire, retrait d’un conducteur, capacité réduite, participant non qualifié, changement de coorganisateur et invalidation d’invitation. Les notifications in-app doivent présenter une action claire et une conséquence compréhensible, sans prétendre constituer une alerte d’urgence.

## Axe 2 — Ajouter un fil social de stories utile à l’outdoor

Les stories ne doivent pas être une copie générique d’Instagram. Le format doit renforcer la découverte locale, la confiance et le souvenir de sortie.

### MVP stories recommandé

Le premier périmètre contient une image ou courte vidéo, une légende, un lien facultatif vers une sortie ou un groupe, une audience explicite — public, amis, groupe — et une durée de 24 heures. Il inclut la consultation, le signalement, le masquage d’un compte et l’expiration réelle du contenu. Les stories terminées ne sont plus distribuées publiquement ; une personne peut néanmoins conserver volontairement une publication classique dans son profil après expiration.

La localisation fine et le partage de position en direct ne doivent pas être activés par défaut. Une story liée à une sortie peut afficher le parc ou la région, mais pas le point de départ précis d’un covoiturage ni la position actuelle d’une personne sans consentement distinct.

### Suite social après le MVP

Une deuxième étape peut ajouter collections de stories de groupe, réactions rapides, mentions contrôlées, souvenir de sortie partagé et import d’une activité Strava choisie par le membre. Les métriques doivent rester secondaires : TrailConnect doit privilégier la qualité de la coordination, le groupe et les décisions responsables plutôt qu’un classement de performance.

## Axe 3 — Connecter l’écosystème outdoor sans fragiliser le produit

### Strava : intégration native progressive

Strava utilise OAuth 2.0 : l’utilisateur autorise l’application, peut refuser certains droits et peut révoquer l’accès. L’application doit être enregistrée, conserver le secret côté serveur uniquement, vérifier les droits effectivement accordés et gérer les jetons d’accès de courte durée avec leurs jetons de renouvellement.[1] [2]

| Étape | Périmètre Strava | Décision de sécurité |
| --- | --- | --- |
| 1. Connexion volontaire | Bouton « Connecter Strava », consentement et déconnexion depuis le profil. | Aucun accès sans action explicite ; secrets et jetons chiffrés côté serveur. |
| 2. Import choisi | L’utilisateur sélectionne une activité récente pour créer un récit ou compléter une sortie passée. | Aucun import automatique ni publication automatique. |
| 3. Rapprochement | Proposition de lier une activité importée à une sortie TrailConnect terminée. | Confirmation humaine avant toute association visible au groupe. |
| 4. Synchronisation optionnelle | Actualisation consentie ou webhook, si utile après validation de valeur. | Respect des limites d’API, journalisation et révocation immédiate. |

Cette stratégie apporte de la valeur sans faire dépendre la logistique de TrailConnect de Strava. Elle répond également à l’usage principal : raconter et valider une activité vécue, pas dicter la sécurité d’une sortie future.

### AllTrails : partenariat ou interopérabilité légère

La documentation publique AllTrails consultée présente notamment des connexions avec Garmin, COROS, Apple Health et Health Connect, ainsi qu’un programme d’affiliation. Elle ne documente pas une API développeur publique de type OAuth/REST permettant d’importer les comptes, parcours et activités de tiers.[3] [4]

La trajectoire recommandée est donc la suivante :

1. **Immédiat :** ajouter un champ « lien de référence du sentier » et des liens profonds AllTrails contrôlés par l’organisateur, avec indication de source et ouverture dans l’application ou le navigateur AllTrails.
2. **Interopérabilité :** conserver l’import GPX/KML fourni par l’utilisateur et ne recopier aucune donnée propriétaire AllTrails.
3. **Partenariat :** contacter AllTrails pour confirmer une possibilité commerciale, d’affiliation enrichie ou de partage approuvé de données.
4. **Décision go/no-go :** ne développer une synchronisation native qu’après accord écrit sur les droits, les marques, les données autorisées, les quotas et l’expérience de déconnexion.

## Feuille de route priorisée

| Horizon | Livrables | Critère de sortie |
| --- | --- | --- |
| **P0 — Prochaines itérations** | Liste d’attente, réservations covoiturage, checklist individuelle, prérequis de niveau et tableau organisateur. | Une sortie complète peut être gérée sans tableur ni conversation externe. |
| **P1 — Boucle de confiance** | Présence, exceptions, journal de décisions, rappels in-app ciblés et débrief structuré. | Organisateur et hiker voient les mêmes statuts importants, avec actions explicites. |
| **P2 — Stories outdoor** | Stories 24 h, audiences, signalement, expiration et conversion facultative en publication. | Le social augmente la découverte et le souvenir sans exposer des données sensibles. |
| **P3 — Strava connecté** | OAuth, import volontaire d’activité, lien à une sortie passée, déconnexion et audit. | Une activité peut enrichir un récit sans publication ou synchronisation imposée. |
| **P4 — AllTrails partenaire** | Liens profonds d’abord ; intégration native seulement si partenariat officiel. | Les droits d’usage et la valeur utilisateur sont validés contractuellement. |

### Périmètre P1 opérationnel retenu

P1 prolonge P0 sans élargir le produit vers les stories. Il couvre quatre états concrets : le participant **se déclare prêt** après avoir consulté les éléments de préparation, l’organisateur voit ce statut sans le transformer en certification, le participant peut être **pointé présent** au départ, et les décisions importantes — admission par niveau, liste d’attente, siège de covoiturage — restent visibles dans les parcours concernés. Les notifications restent **in-app** et ne remplacent ni une alerte officielle, ni les moyens de communication ou de secours sur le terrain.

| Élément P1 | Périmètre retenu | Critère de validation |
| --- | --- | --- |
| Préparation déclarée | Un participant confirmé peut indiquer qu’il se sent prêt ; il peut retirer ce statut avant le départ. | Le statut est persisté et visible à l’organisateur. |
| Présence de départ | L’organisateur pointe les personnes présentes ; l’état reste une donnée de coordination. | Le participant et l’organisateur voient la présence enregistrée. |
| Journal de décisions | Les décisions de niveau, liste d’attente et covoiturage sont consultables dans les surfaces concernées. | Chaque décision a un statut et un auteur/horodatage côté serveur lorsque le modèle le prévoit. |
| Rappels ciblés | Les actions restant à faire sont visibles dans Mes sorties et les notifications in-app. | Aucun envoi externe n’est requis pour le parcours. |

Le périmètre P1 est désormais couvert par le pointage organisateur déjà disponible, le statut de préparation volontaire du participant, les décisions documentées de niveau, la liste d’attente et la réservation de covoiturage. Les parcours sont protégés par des tests UI et serveur ; les notifications restent limitées à l’application tant qu’aucun fournisseur transactionnel n’est approuvé.

### Preuve de validation P0/P1

Le scénario contractuel consolidé couvre désormais la chaîne suivante : une sortie à capacité atteinte bascule un participant en liste d’attente, l’organisateur le promeut, un siège de covoiturage est demandé puis accepté, une exception de niveau est décidée avec note, le participant déclare sa préparation et l’organisateur enregistre la présence. Le test vérifie également la notification in-app de liste d’attente. Les scénarios UI de fiche sortie confirment séparément l’état d’attente, la réservation de covoiturage, la préparation volontaire et la visibilité du statut « prêt » dans la vue organisateur.

## Décisions à prendre avant développement

La première décision est de confirmer que le produit privilégie bien **l’opérabilité de la sortie** avant la croissance sociale. Je recommande de valider P0 et P1 avant les stories, car c’est précisément là que TrailConnect peut se différencier de Strava et AllTrails.

La deuxième décision concerne la politique de niveau. Il faut choisir entre une information simplement déclarative, ou une règle de participation plus ferme pour certaines sorties. La seconde option doit toujours prévoir l’exception documentée de l’organisateur, une formulation prudente et aucune promesse de sécurité.

La troisième décision est partenariale : lancer Strava en bêta fermée dès que les règles de consentement et de stockage sont prêtes ; garder AllTrails au stade de liens profonds et de discussion partenaire tant qu’aucune API ou autorisation officielle n’est confirmée.

## Références

[1] [Strava Developers — Authentication](https://developers.strava.com/docs/authentication/)

[2] [Strava Developers — API v3 Reference](https://developers.strava.com/docs/reference/)

[3] [AllTrails Help — Apps & integrations](https://support.alltrails.com/hc/en-us/sections/360003507031-Apps-integrations)

[4] [AllTrails — Affiliates](https://www.alltrails.com/affiliates)
