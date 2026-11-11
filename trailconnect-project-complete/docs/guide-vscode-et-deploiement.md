# TrailConnect — code source, Visual Studio Code et déploiement

Ce guide explique comment ouvrir le projet dans **Visual Studio Code**, le lancer localement, valider les changements et choisir un déploiement opérationnel. Il distingue l’option recommandée — conserver l’hébergement intégré déjà actif — de l’auto-hébergement, qui demande de remplacer ou de configurer plusieurs services d’infrastructure.

> Le code source fourni ne contient **aucun secret**. Les clés, mots de passe, URL de base de données et jetons de paiement ne doivent jamais être ajoutés à Git, à l’archive partagée ou à un fichier `.env` envoyé par messagerie.

## 1. Ce qui est fourni

L’archive `trailconnect-source-b0b5c78c.zip` contient le code applicatif, les migrations Drizzle, les tests, la documentation, le verrouillage des dépendances (`pnpm-lock.yaml`) et les réglages recommandés pour VS Code. Elle exclut volontairement `node_modules`, les builds, les journaux de développement, les fichiers d’environnement et les actifs médias volumineux déjà stockés séparément.

| Élément | Emplacement | Rôle |
|---|---|---|
| Interface React | `client/src/` | Pages, composants, styles, navigation, accessibilité et formulaires. |
| Serveur | `server/` | Procédures tRPC, règles métier, auth, stockage et accès aux données. |
| Base de données | `drizzle/` | Schéma Drizzle et migrations versionnées `0000` à `0040`. |
| Contrats | `server/hikingValidation.ts` | Validation Zod de toutes les entrées métier. |
| Tests | `server/**/*.test.ts`, `client/src/**/*.test.tsx` | Tests serveur, UI et régression. |
| Documentation | `docs/` | Récapitulatif de mise en œuvre, ce guide et checklist produit. |
| Modèle d’environnement | `docs/local-environment-template.env.example` | Noms des variables requises, sans aucune valeur réelle. |

## 2. Prérequis sur votre ordinateur

Installez une version récente de [Visual Studio Code](https://code.visualstudio.com/), [Git](https://git-scm.com/), [Node.js 22 LTS](https://nodejs.org/) et [pnpm](https://pnpm.io/). Le projet est prévu pour Node 22 et pnpm 10. Une base MySQL 8 ou TiDB est nécessaire pour exécuter le backend complet hors de l’hébergement intégré.

Dans un terminal, vérifiez les outils :

```bash
node --version
pnpm --version
git --version
```

Si pnpm n’est pas disponible après l’installation de Node, activez-le avec Corepack :

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

## 3. Ouvrir le projet dans Visual Studio Code

Décompressez l’archive dans un dossier de travail, par exemple `~/Projects/trailconnect`. Ouvrez ensuite ce dossier, et non l’archive ZIP, dans Visual Studio Code.

```bash
unzip trailconnect-source-b0b5c78c.zip -d ~/Projects
cd ~/Projects/hiking-social-app
code .
```

À la première ouverture, installez les dépendances en utilisant le verrouillage fourni :

```bash
pnpm install --frozen-lockfile
```

Les extensions recommandées sont proposées par le projet. Si VS Code ne les affiche pas, installez manuellement **ESLint**, **Prettier**, **Tailwind CSS IntelliSense**, **Error Lens** et l’extension Drizzle ORM ou SQL de votre choix.

Les tâches VS Code peuvent être ouvertes par le menu **Terminal → Run Task**. Elles proposent l’installation, le serveur de développement, les tests, le contrôle TypeScript et le build.

## 4. Variables d’environnement et démarrage local

Copiez le modèle documentaire puis complétez les valeurs adaptées à votre environnement. Créez votre propre `.env` local, qui est ignoré par Git.

```bash
cp docs/local-environment-template.env.example .env
```

Le serveur lit notamment `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_URL` et `BUILT_IN_FORGE_API_KEY`. Dans l’hébergement intégré, ces valeurs sont injectées et ne doivent pas être copiées. En dehors de cet environnement, elles doivent être remplacées par les services que vous exploitez réellement.

Après configuration, appliquez les migrations sur une base de développement vide ou dédiée :

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Lancez ensuite l’application :

```bash
pnpm dev
```

Le serveur de développement écoute le port que l’environnement fournit. Ouvrez l’URL affichée dans le terminal. Avant chaque contribution, utilisez les contrôles suivants :

```bash
pnpm check
pnpm test
pnpm build
```

| Commande | Utilité |
|---|---|
| `pnpm dev` | Lance le serveur de développement TypeScript avec rechargement. |
| `pnpm check` | Vérifie le typage TypeScript sans générer de fichiers. |
| `pnpm test` | Exécute les tests Vitest. |
| `pnpm build` | Produit le bundle frontend et le serveur de production dans `dist/`. |
| `pnpm start` | Lance la version de production construite. |
| `pnpm db:push` | Génère et applique les migrations ; à employer seulement après revue de la migration produite. |

## 5. Important : ce qui fonctionne immédiatement et ce qui dépend de Manus

Le projet a été construit dans un environnement full-stack géré. L’exécution locale du code est possible, mais certaines intégrations ne peuvent pas être simplement copiées sans configuration équivalente.

| Fonction | Hébergement intégré actuel | Auto-hébergement à prévoir |
|---|---|---|
| Authentification | OAuth géré et injecté. | Configurer un fournisseur OIDC/OAuth compatible, les URLs de retour, les cookies sécurisés et le modèle utilisateur. |
| Base de données | MySQL/TiDB géré. | Fournir `DATABASE_URL`, créer la base, appliquer les migrations et activer TLS en production. |
| Stockage médias | Stockage objet et URLs `/manus-storage/` gérés. | Remplacer ou adapter la couche de stockage vers S3/R2/MinIO et migrer les fichiers existants. |
| Secrets | Gérés côté serveur. | Définir les secrets dans le gestionnaire de l’hébergeur, jamais dans le frontend. |
| Cartes et services intégrés | Accès proxy de l’environnement. | Ajouter vos propres clés/API autorisées et limiter leurs usages. |
| Notifications intégrées | Notifications in-app déjà présentes. | Ajouter un fournisseur e-mail/SMS/push uniquement après choix produit et consentement. |
| Stripe | Fondations présentes, bac à sable à réclamer. | Ajouter les clés, configurer les produits, Checkout, webhooks et règles de remboursement. |

> Une exportation de code ne transfère pas les comptes OAuth, les clés API, les secrets, la base de données de production ni les fichiers du stockage. Ils doivent être migrés ou reconfigurés séparément.

## 6. Déployer « chez vous » : choix recommandé

### Option A — Conserver l’hébergement intégré (recommandé)

L’application est déjà opérationnelle à cette adresse : <https://hikingsocial-hbhva9se.manus.space>. C’est l’option la plus directe car elle conserve la base, l’authentification, le stockage, les secrets, les checkpoints, les migrations et le déploiement dans le même environnement.

Pour l’utiliser avec votre propre marque, ouvrez les réglages du projet puis la section **Domains**. Vous pouvez choisir le préfixe `manus.space`, acheter un domaine ou connecter un domaine que vous possédez. Une fois les enregistrements DNS demandés ajoutés chez votre registrar, le HTTPS est géré par la plateforme.

Cette option est recommandée pour le lancement car elle évite une migration risquée des données et des connecteurs. Le code reste exportable vers GitHub ou sous forme d’archive, mais le site peut continuer d’être exploité sans serveur à administrer.

### Option B — Déployer sur votre propre infrastructure

Cette option donne le contrôle de l’hébergement, mais elle est un **projet de migration**, pas un simple téléversement de ZIP. Elle convient si vous avez une équipe technique, une politique d’hébergement particulière ou des contraintes d’infrastructure.

Le minimum requis est un hébergeur Node.js avec un processus web, une base MySQL/TiDB managée, un stockage objet, un domaine HTTPS, un gestionnaire de secrets et une solution OAuth. Render, Railway, Fly.io, un VPS géré ou un cloud public peuvent convenir si vous mettez en place ces dépendances. Pour ce projet, une plateforme capable de lancer un serveur Express persistant est préférable à un hébergement de fichiers statiques.

Les commandes de build et de démarrage sont :

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Configurez le port à partir de la variable `PORT` de l’hébergeur. Ne fixez pas un numéro de port dans le code. Ajoutez les variables d’environnement dans l’interface des secrets de l’hébergeur, puis configurez une base MySQL/TiDB accessible en TLS. Exécutez les migrations une seule fois par version, dans un job de release contrôlé, jamais simultanément sur plusieurs instances.

Avant d’exposer ce déploiement au public, adaptez les modules dépendants des services intégrés : OAuth, stockage, proxy de cartes et appels aux API internes. Les tests doivent être rejoués après chaque substitution. Une migration de données et de médias doit être validée sur un environnement de préproduction avant de changer le DNS.

### Option C — Exécuter sur votre ordinateur

Vous pouvez lancer la version locale avec `pnpm dev`, mais elle n’est disponible que lorsque votre ordinateur est allumé et connecté. Cette option est adaptée au développement, à une démonstration privée ou à un environnement de test. Elle n’est pas recommandée comme hébergement public permanent sans configuration de sécurité, de sauvegarde, de surveillance et de réseau supplémentaire.

## 7. Déploiement externe : checklist opérationnelle

| Étape | Vérification attendue |
|---|---|
| Base de données | Base MySQL/TiDB créée, `DATABASE_URL` injectée, migration revue et appliquée. |
| Authentification | Fournisseur OAuth/OIDC configuré, URL de retour de production déclarée, cookies sécurisés testés. |
| Stockage | Bucket créé, droits minimaux configurés, téléversement et lecture de média testés. |
| Domaine | Domaine choisi, DNS pointé, HTTPS actif, redirections HTTP→HTTPS vérifiées. |
| Secrets | Aucun secret dans Git ; secrets enregistrés seulement dans l’hébergeur. |
| Stripe | Bac à sable réclamé, webhook signé, Checkout testé avant toute transaction réelle. |
| Météo/cartes | Clés ou fournisseurs autorisés configurés et quotas surveillés. |
| Recette | Tests, build, comptes organisateur/participant/admin, création, inscription, Jour J, annulation et modération vérifiés. |
| Sauvegardes | Politique de sauvegarde base et médias définie, restauration testée. |
| Monitoring | Logs serveur, erreurs client, disponibilité et alertes d’exploitation définis. |

## 8. Mise en production fonctionnelle

Le lancement ne doit pas commencer par les paiements ou la localisation partagée. Commencez avec les sorties gratuites, la logistique, les notifications in-app et une modération active. Renseignez des sorties réelles, des images dont les droits sont confirmés, des conditions de participation, des sources météo officielles et des informations terrain vérifiées par l’organisation.

Avant une sortie guidée payante, faites relire les CGU, la politique de confidentialité, les consentements de localisation, les règles d’annulation et les obligations d’assurance par les personnes compétentes. Les fonctions météo, GPX, niveau, SOS, état de sentier et partage de position doivent rester formulées comme des aides indicatives et non comme des garanties.

## 9. Où trouver l’aide dans le code

| Besoin | Fichier de départ |
|---|---|
| Ajouter un champ de sortie | `drizzle/schema.ts`, puis `server/hikingValidation.ts`, `server/db.ts`, `server/hikingRouter.ts` et le composant concerné. |
| Ajouter une page | `client/src/pages/`, puis le routage dans `client/src/pages/Home.tsx`. |
| Ajouter un test | Fichier adjacent `*.test.ts` ou `*.test.tsx`, puis `pnpm test`. |
| Modifier la préparation Jour J | `client/src/components/DayOfBrief.tsx`, `OperationalReadinessPanel.tsx`, `OperationalRoutePanel.tsx`. |
| Modifier les repères terrain | `client/src/components/TerrainLandmarksPanel.tsx`. |
| Modifier le parcours de création | `client/src/pages/CreateEventPage.tsx`. |
| Modifier les intégrations | `shared/integrations.ts`, `server/hikingRouter.ts`, `server/db.ts` et l’espace Compte. |
| Modifier les couvertures | `ResponsiveCoverImage.tsx`, `CoverFocalPointPicker.tsx` et `CoverFocalPointManager.tsx`. |

## 10. Résumé de décision

Pour rendre TrailConnect opérationnel rapidement, conservez l’hébergement intégré, connectez un domaine, complétez le contenu réel et faites une recette métier. Exportez le ZIP et poussez le code vers GitHub comme sauvegarde et base de développement dans VS Code.

Pour être totalement indépendant de l’environnement actuel, prévoyez un chantier dédié : migration base de données et médias, remplacement de l’OAuth et du stockage intégrés, reconfiguration des secrets, déploiement Node/Express, recette de sécurité et bascule DNS. Cette seconde voie est réalisable, mais ne doit pas être engagée sans responsable technique et environnement de préproduction.
