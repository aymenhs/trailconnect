# Déploiement sur Ubuntu

Procédure complète pour une machine unique, pilotée depuis un poste Windows sur
le même réseau. Testée sur Ubuntu 24.04.
Dimensionnement de référence : i5, 12 Go RAM, 256 Go SSD.

Dans les commandes ci-dessous, remplacez :

| Placeholder | Signification |
|---|---|
| `192.168.1.50` | l'adresse du serveur (`hostname -I` sur l'Ubuntu) |
| `aymen` | votre compte de session Ubuntu |
| `trailconnect.example.com` | votre nom d'hôte |

## 0a. Reconnaissance — si la machine sert déjà à autre chose

**À faire avant toute installation.** Plusieurs étapes de cette procédure sont
destructrices sur une machine déjà en service : écraser `/etc/caddy/Caddyfile`
supprime les sites existants, installer `mysql-server` par-dessus MariaDB casse
les deux, et `timedatectl set-timezone UTC` décale les journaux de tous les
autres services.

Copiez le script et lisez son rapport. Il ne fait que lire — il n'installe,
n'écrit et ne redémarre rien.

```powershell
scp deploy\preflight.sh aymen@192.168.1.50:~/
ssh aymen@192.168.1.50 "bash ~/preflight.sh"
```

Il classe chaque constat en `[ ok ]`, `[note]`, `[WARN]` (procédure à adapter)
et `[STOP]` (la procédure standard casserait quelque chose), et se termine par
un verdict.

Les adaptations les plus fréquentes :

| Constat | Adaptation |
|---|---|
| Caddy sert déjà des sites | Ne pas remplacer le `Caddyfile` — passer par `import /etc/caddy/sites/*.caddy` (§8) |
| Caddy a déjà des certificats | Les ports 80/443 sont donc ouverts : **HTTP-01 suffit**, DNS-01 devient inutile (§0b) |
| Port 3000 occupé | Poser `PORT=` dans l'environnement **et** dans le bloc Caddy — les deux doivent concorder |
| MariaDB installée | La réutiliser, ne surtout pas installer `mysql-server` par-dessus |
| Machine pas en UTC | Ne pas changer le fuseau système : `Environment=TZ=UTC` dans l'unité + `?timezone=Z` sur `DATABASE_URL` |
| Node < 22 déjà utilisé | Installer `fnm`/`nvm` et pointer `ExecStart` sur le binaire Node 22, sans toucher au Node global |

> **Le piège du port.** Si 3000 est pris, le serveur balaie 3001 à 3019 et
> démarre **silencieusement** sur le premier libre — pendant que Caddy continue
> de pointer sur 3000. Le symptôme est un 502 sans explication.

## 0b. Décider l'accès HTTPS — à trancher en premier

**Le HTTPS n'est pas optionnel, même sur un réseau local.** `/api/oauth/login`
pose son cookie anti-CSRF avec `Secure` ; sur `http://192.168.1.50` le
navigateur le refuse en silence et la connexion ne peut jamais aboutir. Google
rejette par ailleurs les adresses IP privées comme URI de redirection.

Deux voies :

**A. Nom de domaine + certificat DNS-01** *(machine purement locale)*
Pointez un enregistrement A public vers l'adresse privée du serveur. Il ne
résout que pour vous — une IP privée est inatteignable depuis Internet — et
Let's Encrypt valide par un enregistrement TXT sans jamais contacter la machine.
Aucun port à ouvrir. Voir le bloc B du `Caddyfile`.

> **Si `preflight.sh` signale que Caddy possède déjà des certificats**, les ports
> 80/443 sont joignables depuis Internet et vous n'avez pas besoin de DNS-01 :
> un simple bloc de site suffit, Caddy obtiendra le certificat en HTTP-01 comme
> pour vos autres domaines. C'est le cas le plus simple — bloc A du `Caddyfile`.

**B. Tunnel SSH vers `localhost`** *(dépannage, poste Windows uniquement)*
Google accepte `http://localhost`. Depuis PowerShell :
`ssh -L 3000:127.0.0.1:3000 aymen@192.168.1.50`, puis déclarez
`http://localhost:3000/api/oauth/callback` et posez `APP_URL=http://localhost:3000`.
Suffisant pour valider l'installation, inutilisable pour d'autres appareils.

## 1. Accès SSH depuis Windows

Le client OpenSSH est livré avec Windows 11. Dans PowerShell :

```powershell
ssh-keygen -t ed25519 -C "aymen@windows"
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh aymen@192.168.1.50 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

Fixez l'adresse du serveur dans votre box (bail DHCP statique) : elle est
inscrite dans le DNS et dans votre configuration SSH.

## 2. Paquets — réutiliser d'abord

**Principe : rien de ce qui est déjà installé n'est remplacé, mis à jour ou
reconfiguré.** Le rapport de `preflight.sh` se termine par un plan qui nomme
exactement ce qu'il reste à ajouter. N'installez que cela.

Ce que la procédure ne touche à aucun moment :

| Jamais modifié | Ce qu'on fait à la place |
|---|---|
| `/etc/caddy/Caddyfile` | On y ajoute une seule ligne `import`, et on sauvegarde avant |
| La configuration MySQL | Aucun réglage global, aucun redémarrage du serveur |
| Le fuseau horaire système | Isolé au niveau du service (`TZ=UTC`) |
| Le Node / pnpm des autres services | Jamais remplacés |
| Les bases existantes | On en crée une nouvelle, à côté |
| `/etc/sudoers` | On dépose un fichier dans `/etc/sudoers.d/` |

```bash
sudo apt update
sudo apt install -y curl git      # sans risque, déjà présents la plupart du temps
```

**Node 22** — uniquement si `node -v` renvoie moins de 22.
Si un autre service dépend du Node actuel, ne le remplacez pas : posez un Node 22
à côté et pointez le déploiement dessus.

```bash
# Cas A — aucun autre service ne dépend de Node : NodeSource convient
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Cas B — un autre service utilise Node : installation parallèle, rien d'écrasé
curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz \
  | sudo tar -xJ -C /opt
sudo ln -sfn /opt/node-v22.14.0-linux-x64 /opt/node22
# puis, dans /etc/trailconnect/env :  NODE_BIN_DIR=/opt/node22/bin
# et dans trailconnect.service :      ExecStart=/opt/node22/bin/node dist/index.js
```

**pnpm** — rien à installer. `corepack pnpm` (livré avec Node) résout la version
épinglée dans `package.json` sans créer de shim global. C'est ce qu'utilise
`deploy.sh`. Ne lancez pas `corepack enable`, qui écrirait des liens globaux
susceptibles de masquer un pnpm existant.

**Base de données** — uniquement si `preflight.sh` n'en a trouvé aucune.
MariaDB 10.6+ convient : dans ce cas, réutilisez-la et **n'installez surtout pas
`mysql-server` par-dessus**, les paquets entrent en conflit.

```bash
sudo apt install -y mysql-server
```

**Caddy** — uniquement s'il est absent.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## 3. Utilisateur et arborescence

Le service tourne sous un compte sans connexion qui **n'écrit que les
téléversements**. Le code lui est accessible en lecture seule ; c'est votre
compte qui déploie.

```bash
sudo useradd --system --home /opt/trailconnect --shell /usr/sbin/nologin trailconnect
sudo mkdir -p /opt/trailconnect /var/lib/trailconnect/uploads /etc/trailconnect /srv/git
sudo chown -R aymen:aymen /opt/trailconnect /srv/git
sudo chown -R trailconnect:trailconnect /var/lib/trailconnect
sudo chmod 755 /opt/trailconnect
```

## 4. Base de données

```bash
sudo mysql
```

Puis, à l'invite MySQL :

```sql
CREATE DATABASE trailconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'trailconnect'@'127.0.0.1' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON trailconnect.* TO 'trailconnect'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

### Fuseau horaire

Les colonnes métier sont en `DATETIME` naïf : Node et MySQL doivent s'accorder
sur UTC, sinon les fenêtres de 48 h et 72 h (rappels de départ, clôture des
inscriptions) dérivent silencieusement.

**Sur une machine dédiée**, le plus simple est de tout passer en UTC :
`sudo timedatectl set-timezone UTC`, et `default-time-zone='+00:00'` dans
`/etc/mysql/mysql.conf.d/mysqld.cnf`.

**Sur une machine partagée, ne faites ni l'un ni l'autre** — vous décaleriez les
journaux et les tâches planifiées de vos autres services, et changeriez
l'interprétation des dates de leurs bases. Isolez TrailConnect :

- `Environment=TZ=UTC` dans `trailconnect.service` (déjà présent dans l'unité
  fournie) — le processus Node tourne en UTC, la machine garde son heure locale ;
- `?timezone=Z` à la fin de `DATABASE_URL` — la connexion mysql2 impose UTC pour
  cette session seulement, sans toucher au réglage global du serveur :
  ```
  DATABASE_URL=mysql://trailconnect:MDP@127.0.0.1:3306/trailconnect?timezone=Z
  ```

### Mémoire — ne rien régler sur une base partagée

Sur une machine dédiée, `innodb_buffer_pool_size = 2G` serait le bon réglage.
**Sur une base déjà utilisée par autre chose, laissez-la tranquille** : modifier
`mysqld.cnf` impose un redémarrage de MySQL, donc une coupure pour ses autres
utilisateurs. La valeur par défaut fonctionne — elle est simplement moins rapide,
ce qui est sans conséquence à l'échelle de quelques centaines de sorties.

## 5. Dépôt Git et premier envoi

Sur le serveur :

```bash
git init --bare /srv/git/trailconnect.git
```

Depuis Windows, à la racine du projet :

```powershell
git init
git add -A
git commit -m "chore: initial import"
git branch -M main
git remote add origin ssh://aymen@192.168.1.50/srv/git/trailconnect.git
git push -u origin main
```

> Vérifiez que `.project-config.json` n'est **pas** dans le commit
> (`git ls-files | Select-String project-config` doit ne rien renvoyer) : il
> contient les secrets Manus en clair. Le `.gitignore` l'exclut déjà.

## 6. Configuration

```bash
sudo cp /opt/trailconnect/.env.example /etc/trailconnect/env
sudo chown root:trailconnect /etc/trailconnect/env
sudo chmod 640 /etc/trailconnect/env
sudo usermod -aG trailconnect aymen   # pour que le script de déploiement le lise
sudo nano /etc/trailconnect/env
```

Reconnectez-vous pour que l'appartenance au groupe prenne effet.

Générer les secrets :

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # CRON_SECRET
```

**Google OAuth** — console Google Cloud → *Identifiants* → *ID client OAuth*,
type « Application Web ». URI de redirection autorisé, exactement :
`https://trailconnect.example.com/api/oauth/callback`.

**Clé Maps** — créer une clé navigateur distincte, puis la **restreindre par
référent HTTP** à votre domaine. Une clé navigateur est publique par nature :
c'est la restriction qui la protège, pas le secret.

> **Les variables `VITE_*` sont figées dans le bundle au moment du build**, pas
> lues au démarrage. Les modifier impose un `pnpm run build`, pas un simple
> redémarrage. Le script de déploiement les exporte depuis ce fichier.

## 7. Déploiement

```bash
sudo cp /opt/trailconnect/deploy/deploy.sh /usr/local/bin/trailconnect-deploy
sudo chmod +x /usr/local/bin/trailconnect-deploy

echo 'aymen ALL=(root) NOPASSWD: /usr/bin/systemctl restart trailconnect' \
  | sudo tee /etc/sudoers.d/trailconnect
sudo chmod 440 /etc/sudoers.d/trailconnect

sudo cp /opt/trailconnect/deploy/trailconnect.service /etc/systemd/system/
sudo cp /opt/trailconnect/deploy/trailconnect-deletions.service /etc/systemd/system/
sudo cp /opt/trailconnect/deploy/trailconnect-deletions.timer /etc/systemd/system/
sudo cp /opt/trailconnect/deploy/trailconnect-maintenance.service /etc/systemd/system/
sudo cp /opt/trailconnect/deploy/trailconnect-maintenance.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable trailconnect trailconnect-deletions.timer trailconnect-maintenance.timer

trailconnect-deploy
```

Le script fait la sortie de dépôt, l'installation, les migrations, le build, le
redémarrage, puis **vérifie que `/healthz` répond** avant de se déclarer
satisfait. En cas d'échec il affiche les journaux.

> Il exécute `drizzle-kit migrate` seul, jamais `generate` : `generate` peut
> poser une question sur un renommage de colonne, et une question dans un script
> de déploiement bloque indéfiniment.

> Gardez le port 3000 libre. Le serveur bascule silencieusement sur un autre
> port s'il est occupé, et Caddy continue de pointer sur 3000.

## 8. Reverse proxy

### Si Caddy sert déjà d'autres sites

**Ne remplacez pas `/etc/caddy/Caddyfile`** : vos sites actuels disparaîtraient.
Ajoutez le vôtre à côté.

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)
sudo mkdir -p /etc/caddy/sites

# Une seule fois, à ajouter en fin de /etc/caddy/Caddyfile :
#     import /etc/caddy/sites/*.caddy
sudo nano /etc/caddy/Caddyfile

sudo cp /opt/trailconnect/deploy/Caddyfile /etc/caddy/sites/trailconnect.caddy
sudo nano /etc/caddy/sites/trailconnect.caddy   # domaine, port, choix du bloc

# Valider AVANT de recharger : une erreur de syntaxe couperait tous les sites.
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy       # reload, pas restart
```

`reload` applique la nouvelle configuration sans interrompre les connexions en
cours — vos autres services ne s'en aperçoivent pas.

### Sur une machine vierge

```bash
sudo cp /opt/trailconnect/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile     # domaine, port, choix du bloc
sudo systemctl restart caddy
```

### DNS-01 — seulement si les ports 80/443 sont fermés

Inutile si `preflight.sh` a trouvé des certificats existants : les ports sont
alors ouverts et HTTP-01 suffit (bloc A).

Deux façons, dont une seule est non destructive.

**Recommandé — certificat obtenu à part, binaire Caddy intact (bloc C).**
`acme.sh` s'installe dans votre home et pose sa propre tâche de renouvellement.
Rien de global n'est modifié, aucune coupure.

```bash
curl https://get.acme.sh | sh -s email=vous@example.com
export CF_Token="votre_jeton"          # Cloudflare : Zone → DNS → Edit
~/.acme.sh/acme.sh --issue --dns dns_cf -d trailconnect.example.com

sudo mkdir -p /etc/caddy/certs
~/.acme.sh/acme.sh --install-cert -d trailconnect.example.com \
  --key-file       /etc/caddy/certs/trailconnect.key \
  --fullchain-file /etc/caddy/certs/trailconnect.crt \
  --reloadcmd      "sudo systemctl reload caddy"
```

**À éviter sur une machine partagée — module Caddy (bloc B).**

```bash
sudo caddy add-package github.com/caddy-dns/cloudflare
```

> Cette commande **remplace le binaire Caddy** et redémarre le service : coupure
> brève pour tous vos autres sites, et risque que le nouveau binaire refuse une
> configuration que l'ancien acceptait. Le bloc C obtient le même résultat sans
> toucher à Caddy.

### Vérification

```bash
journalctl -u caddy -f     # suivre l'obtention du certificat
```

## 9. Premier administrateur

L'application ne promeut personne toute seule.

1. Se connecter une fois via l'interface.
2. Récupérer l'identité :
   `sudo mysql trailconnect -e "SELECT externalId, email FROM users;"`
3. Reporter la valeur dans `OWNER_EXTERNAL_ID` (`/etc/trailconnect/env`).
4. `sudo systemctl restart trailconnect`, puis se reconnecter.

## 10. Sauvegardes

Une machine unique est un point unique de défaillance. Deux choses à sauvegarder,
**et les téléversements ne sont pas reconstructibles depuis la base**.

Créez `/etc/cron.daily/trailconnect-backup` :

```sh
#!/bin/sh
set -eu
DEST=/var/backups/trailconnect
DATE=$(date +%F)
mkdir -p "$DEST"
mysqldump --single-transaction --routines trailconnect | gzip > "$DEST/db-$DATE.sql.gz"
tar czf "$DEST/uploads-$DATE.tar.gz" -C /var/lib/trailconnect uploads
find "$DEST" -type f -mtime +30 -delete
```

puis `sudo chmod +x /etc/cron.daily/trailconnect-backup`.

Copiez `/var/backups/trailconnect` **hors de la machine** (rsync, rclone, S3).
Une sauvegarde qui vit sur le disque qu'elle protège n'en est pas une.

## 11. Supervision

`/healthz` renvoie 200 si la base répond, 503 sinon — il exécute un vrai
`SELECT 1`, pas une simple réponse de vie. À brancher sur une surveillance
externe (Uptime Kuma, healthchecks.io).

```bash
journalctl -u trailconnect -f
systemctl list-timers trailconnect-deletions.timer trailconnect-maintenance.timer
journalctl -u trailconnect-maintenance --since today
```

Le minuteur `trailconnect-maintenance` passe toutes les 15 minutes : il marque
comme terminées les sorties dont la fin prévue (plus 3 h) est dépassée, et
envoie les rappels de départ (la veille, puis moins de 2 h avant). Sans lui,
aucune sortie ne passe à « terminée » et les indicateurs des organisateurs
restent vides.

## Mise à jour au quotidien

Depuis Windows :

```powershell
git push
ssh aymen@192.168.1.50 trailconnect-deploy
```

Revenir en arrière : `ssh aymen@192.168.1.50 trailconnect-deploy <sha-précédent>`.

## Budget mémoire

| Composant | Ordre de grandeur |
|---|---|
| Node | 1–2 Go |
| MySQL (`innodb_buffer_pool_size=2G`) | ~3 Go |
| Caddy | ~50 Mo |
| Umami (optionnel, Docker) | ~300 Mo |
| Système | ~1 Go |
| **Total** | **~6 Go sur 12 Go** |

## Reprise des données Manus

Si des comptes existent déjà sur l'ancien déploiement :

1. Exporter la base TiDB (`mysqldump`) et l'importer telle quelle : le schéma
   est identique.
2. Les `externalId` Manus restent en base et sont acceptés. Mais l'identité vient
   désormais de Google (`google:<sub>`), donc **ces comptes ne se reconnecteront
   pas** tels quels. Rattacher par adresse courriel :
   ```sql
   -- À vérifier ligne à ligne avant de l'appliquer.
   UPDATE users SET externalId = CONCAT('google:', ?) WHERE email = ?;
   ```
3. Les fichiers du stockage Forge doivent être copiés dans `UPLOAD_DIR` en
   conservant leurs clés : les URL `/manus-storage/...` en base restent servies
   par la route de compatibilité.
