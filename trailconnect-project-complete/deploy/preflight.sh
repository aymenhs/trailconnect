#!/usr/bin/env bash
#
# Reconnaissance before installing TrailConnect on a machine that already runs
# something else. Reads only — it never installs, writes or restarts anything.
#
#   bash preflight.sh
#
# Every finding is tagged:
#   [ ok ]    nothing to do
#   [note]    worth knowing, no action forced
#   [WARN]    the standard procedure needs adapting here
#   [STOP]    following the standard procedure would break something
#
# Run it as a user who can sudo; a few checks degrade gracefully without.

set -uo pipefail

ok()   { printf '  [ ok ] %s\n' "$*"; }
note() { printf '  [note] %s\n' "$*"; }
warn() { printf '  [WARN] %s\n' "$*"; WARNS=$((WARNS+1)); }
stop() { printf '  [STOP] %s\n' "$*"; STOPS=$((STOPS+1)); }
head_() { printf '\n\033[1m── %s\033[0m\n' "$*"; }

WARNS=0
STOPS=0
have() { command -v "$1" >/dev/null 2>&1; }

# Reuse plan, filled in as we go. Nothing here is ever "replace": the only
# allowed outcomes are "reuse what is there" or "add what is missing".
INSTALL_NODE="?"; INSTALL_DB="?"; INSTALL_CADDY="?"
CADDY_SHARED="no"; CERTS_EXIST="no"; NEED_DNS="?"
PORT_PICK="3000"; TZ_ISOLATE="no"; DB_FLAVOUR=""
NODE_NOTE=""

# sudo without prompting, so the script never blocks
SUDO=""
if [ "$(id -u)" -ne 0 ] && have sudo && sudo -n true 2>/dev/null; then
  SUDO="sudo -n"
elif [ "$(id -u)" -eq 0 ]; then
  SUDO=""
fi

printf '\033[1mTrailConnect — reconnaissance\033[0m\n'
printf '%s · %s\n' "$(date -Is)" "$(hostname)"

# ── System ───────────────────────────────────────────────────────────────────
head_ "Système"

if [ -r /etc/os-release ]; then
  . /etc/os-release
  printf '  %s (%s)\n' "${PRETTY_NAME:-inconnu}" "$(uname -m)"
  case "${VERSION_ID:-}" in
    22.04|24.04|24.10|25.04) ok "version supportée par la procédure" ;;
    *) note "procédure testée sur 22.04 et 24.04 — adapte si besoin" ;;
  esac
fi

MEM_TOTAL=$(awk '/MemTotal/{printf "%.1f", $2/1048576}' /proc/meminfo 2>/dev/null)
MEM_AVAIL=$(awk '/MemAvailable/{printf "%.1f", $2/1048576}' /proc/meminfo 2>/dev/null)
[ -z "$MEM_TOTAL" ] && MEM_TOTAL="?"
[ -z "$MEM_AVAIL" ] && MEM_AVAIL="?"
printf '  RAM : %s Go au total, %s Go disponibles\n' "$MEM_TOTAL" "$MEM_AVAIL"

if [ "$MEM_AVAIL" != "?" ]; then
  if awk "BEGIN{exit !($MEM_AVAIL < 3)}"; then
    stop "moins de 3 Go libres — Node + MySQL ne tiendront pas à côté de l'existant"
  elif awk "BEGIN{exit !($MEM_AVAIL < 5)}"; then
    warn "moins de 5 Go libres — surveille la mémoire au premier démarrage"
    echo "         Ne touche pas à innodb_buffer_pool_size sur une base partagée :"
    echo "         le modifier impose un redémarrage de MySQL, donc une coupure pour"
    echo "         tes autres services. La valeur par défaut fonctionne."
  else
    ok "marge suffisante pour Node (~1,5 Go) à côté de l'existant"
  fi
fi

DISK=$(df -h --output=avail / 2>/dev/null | tail -1 | tr -d ' ')
printf '  Disque libre sur / : %s\n' "${DISK:-?}"

printf '  Charge : %s\n' "$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null)"

# ── Timezone ─────────────────────────────────────────────────────────────────
head_ "Fuseau horaire"

TZ_NOW=$(timedatectl show -p Timezone --value 2>/dev/null || cat /etc/timezone 2>/dev/null || echo "?")
printf '  Système : %s\n' "$TZ_NOW"

if [ "$TZ_NOW" = "UTC" ] || [ "$TZ_NOW" = "Etc/UTC" ]; then
  ok "déjà en UTC — rien à changer"
  TZ_ISOLATE="no"
else
  TZ_ISOLATE="yes"
  warn "la machine n'est pas en UTC"
  echo "         Ne bascule PAS tout le système : cela décalerait les journaux et"
  echo "         les tâches planifiées de tes autres services."
  echo "         À la place, isole TrailConnect :"
  echo "           · systemd  → Environment=TZ=UTC dans trailconnect.service"
  echo "           · MySQL    → ajoute ?timezone=Z à la fin de DATABASE_URL"
  echo "         (les deux sont pris en charge sans toucher aux réglages globaux)"
fi

# ── Ports ────────────────────────────────────────────────────────────────────
head_ "Ports occupés"

LISTEN=""
if have ss; then
  LISTEN=$($SUDO ss -tlnp 2>/dev/null || ss -tln 2>/dev/null)
elif have netstat; then
  LISTEN=$($SUDO netstat -tlnp 2>/dev/null || netstat -tln 2>/dev/null)
fi

port_user() {
  printf '%s\n' "$LISTEN" | awk -v p=":$1\$" '$4 ~ p {print $0}' | head -1
}
port_busy() {
  printf '%s\n' "$LISTEN" | awk -v p=":$1\$" '$4 ~ p {found=1} END{exit !found}'
}

if [ -z "$LISTEN" ]; then
  note "ni ss ni netstat — impossible de lister les ports"
else
  for p in 80 443 3306; do
    if port_busy "$p"; then
      printf '  %-6s occupé : %s\n' "$p" "$(port_user "$p" | sed 's/  */ /g' | cut -c1-110)"
    else
      printf '  %-6s libre\n' "$p"
    fi
  done

  # The app scans 3000..3019 and silently takes the first free one, while Caddy
  # keeps pointing at whatever you configured. Find a port it will actually get.
  FREE_PORT=""
  for p in $(seq 3000 3019); do
    if ! port_busy "$p"; then FREE_PORT=$p; break; fi
  done

  if port_busy 3000; then
    warn "le port 3000 est déjà pris : $(port_user 3000 | sed 's/  */ /g' | cut -c1-90)"
    if [ -n "$FREE_PORT" ]; then
      PORT_PICK="$FREE_PORT"
      echo "         Pose PORT=$FREE_PORT dans /etc/trailconnect/env ET dans le bloc"
      echo "         Caddy (reverse_proxy 127.0.0.1:$FREE_PORT). Sinon l'application"
      echo "         démarre sur un port que le proxy ignore, et tu obtiens un 502."
    else
      stop "aucun port libre entre 3000 et 3019 — l'application refusera de démarrer"
    fi
  else
    PORT_PICK="3000"
    ok "port 3000 libre"
  fi
fi

# ── Caddy ────────────────────────────────────────────────────────────────────
head_ "Caddy"

if have caddy; then
  INSTALL_CADDY="non — déjà présent"
  printf '  %s\n' "$(caddy version 2>/dev/null | head -1)"

  if caddy list-modules 2>/dev/null | grep -q '^dns\.providers\.'; then
    NEED_DNS="non — module déjà présent"
    ok "un module DNS est déjà présent : $(caddy list-modules 2>/dev/null | grep '^dns\.providers\.' | tr '\n' ' ')"
  else
    note "aucun module DNS — nécessaire seulement pour la voie DNS-01"
    echo "         'caddy add-package' remplace le binaire et redémarre le service :"
    echo "         brève coupure pour tes sites existants. Sauvegarde la config avant."
  fi

  CFG=/etc/caddy/Caddyfile
  if [ -f "$CFG" ]; then
    SITES=$(grep -cE '^[a-zA-Z0-9*:.-]+[[:space:]]*\{' "$CFG" 2>/dev/null || echo 0)
    printf '  %s : %s bloc(s) de site déclaré(s)\n' "$CFG" "$SITES"
    if [ "${SITES:-0}" -gt 0 ]; then
      CADDY_SHARED="yes"
      stop "NE REMPLACE PAS $CFG — tes sites actuels disparaîtraient"
      echo "         Procédure sûre :"
      echo "           sudo cp $CFG $CFG.bak-\$(date +%F)"
      echo "           sudo mkdir -p /etc/caddy/sites"
      echo "           # ajouter en fin de Caddyfile, une seule fois :"
      echo "           #   import /etc/caddy/sites/*.caddy"
      echo "           # puis déposer le bloc TrailConnect dans"
      echo "           #   /etc/caddy/sites/trailconnect.caddy"
      echo "           sudo caddy validate --config $CFG && sudo systemctl reload caddy"
      if grep -qE '^\s*import\s' "$CFG" 2>/dev/null; then
        ok "une directive 'import' existe déjà : $(grep -E '^\s*import\s' "$CFG" | head -1 | sed 's/^ *//')"
      fi
      echo
      echo "         Domaines actuellement servis :"
      grep -oE '^[a-zA-Z0-9*][a-zA-Z0-9*.-]+\.[a-z]{2,}' "$CFG" 2>/dev/null | sed 's/^/           · /' | head -10
    fi
  else
    note "$CFG absent"
  fi

  # Existing Let's Encrypt certs prove HTTP-01 worked, which proves 80/443 are
  # reachable from the internet — DNS-01 is then unnecessary.
  CERTDIR=/var/lib/caddy/.local/share/caddy/certificates
  if $SUDO test -d "$CERTDIR" 2>/dev/null; then
    NCERT=$($SUDO find "$CERTDIR" -name '*.crt' 2>/dev/null | wc -l)
    if [ "${NCERT:-0}" -gt 0 ]; then
      CERTS_EXIST="yes"; NEED_DNS="non — HTTP-01 fonctionne déjà"
      ok "$NCERT certificat(s) déjà obtenu(s) par Caddy"
      echo "         → les ports 80/443 sont donc joignables depuis Internet."
      echo "           Tu n'as PAS besoin de DNS-01 : un simple bloc de site suffit,"
      echo "           Caddy obtiendra le certificat en HTTP-01 comme pour tes autres."
      $SUDO find "$CERTDIR" -name '*.crt' 2>/dev/null \
        | sed 's#.*/##; s/\.crt$//; s/^/           · /' | head -8
    fi
  fi

  systemctl is-active --quiet caddy 2>/dev/null && ok "service caddy actif" \
    || note "service caddy inactif"
else
  INSTALL_CADDY="oui — absent"
  ok "Caddy absent — installation propre, aucun risque de conflit"
fi

# ── MySQL / MariaDB ──────────────────────────────────────────────────────────
head_ "Base de données"

DBFLAVOUR=""
if systemctl list-units --type=service --all 2>/dev/null | grep -qE 'mariadb\.service'; then
  DBFLAVOUR="mariadb"
elif systemctl list-units --type=service --all 2>/dev/null | grep -qE 'mysql\.service'; then
  DBFLAVOUR="mysql"
fi

if [ -n "$DBFLAVOUR" ]; then
  printf '  Détecté : %s\n' "$DBFLAVOUR"
  have mysql && printf '  %s\n' "$(mysql --version 2>/dev/null)"

  if [ "$DBFLAVOUR" = "mariadb" ]; then
    INSTALL_DB="non — réutiliser MariaDB"
    warn "c'est MariaDB, pas MySQL"
    echo "         N'installe SURTOUT PAS mysql-server par-dessus : les paquets"
    echo "         entrent en conflit et apt peut désinstaller MariaDB."
    echo "         MariaDB 10.6+ convient : réutilise-la, crée juste la base"
    echo "         et l'utilisateur (phase 4), et saute l'installation."
  else
    INSTALL_DB="non — réutiliser MySQL"
    ok "MySQL déjà en place — réutilise-la, saute l'installation du paquet"
  fi

  if $SUDO mysql -N -B -e 'SHOW DATABASES;' >/dev/null 2>&1; then
    echo "  Bases existantes :"
    $SUDO mysql -N -B -e 'SHOW DATABASES;' 2>/dev/null \
      | grep -vE '^(information_schema|performance_schema|mysql|sys)$' \
      | sed 's/^/           · /'
    if $SUDO mysql -N -B -e 'SHOW DATABASES;' 2>/dev/null | grep -qx 'trailconnect'; then
      stop "une base 'trailconnect' existe déjà — choisis un autre nom ou sauvegarde-la"
    fi
    TZV=$($SUDO mysql -N -B -e "SELECT @@global.time_zone;" 2>/dev/null)
    printf '  time_zone du serveur : %s\n' "${TZV:-?}"
    if [ -n "$TZV" ] && [ "$TZV" != "+00:00" ] && [ "$TZV" != "UTC" ]; then
      note "ne le change pas globalement : ajoute ?timezone=Z à DATABASE_URL"
    fi
  else
    note "pas d'accès mysql sans mot de passe — inspection des bases impossible"
  fi
else
  INSTALL_DB="oui — aucune base présente"
  ok "aucune base détectée — installation propre"
fi

# ── Node ─────────────────────────────────────────────────────────────────────
head_ "Node et pnpm"

if have node; then
  NV=$(node -v 2>/dev/null)
  NMAJ=$(printf '%s' "$NV" | sed 's/^v//; s/\..*//')
  printf '  node %s (%s)\n' "$NV" "$(command -v node)"
  if [ "${NMAJ:-0}" -ge 22 ]; then
    INSTALL_NODE="non — Node $NV convient"
    ok "version suffisante — n'installe pas NodeSource par-dessus"
  else
    INSTALL_NODE="oui — MAIS sans toucher au Node global"
    NODE_NOTE="fnm/nvm ou tarball dans /opt, puis NODE_BIN_DIR= dans le déploiement"
    warn "Node $NV est trop ancien (il faut 22+)"
    echo "         Si un autre service tourne sur ce Node, ne le remplace pas"
    echo "         globalement : installe fnm ou nvm et épingle Node 22 pour"
    echo "         TrailConnect seul, en pointant ExecStart sur ce binaire-là."
  fi
  case "$(command -v node)" in
    *"/.nvm/"*|*"/.fnm/"*|*"/.volta/"*)
      warn "ce Node vient d'un gestionnaire de versions propre à ton compte"
      echo "         systemd ne le verra pas : mets le chemin absolu dans ExecStart."
      ;;
  esac
else
  INSTALL_NODE="oui — absent"
  ok "Node absent — installation propre"
fi

have pnpm && printf '  pnpm %s\n' "$(pnpm -v 2>/dev/null)" || note "pnpm absent (corepack le fournira)"
have corepack && ok "corepack disponible" || note "corepack absent"

# ── Collisions de noms ───────────────────────────────────────────────────────
head_ "Noms et chemins déjà pris"

id trailconnect >/dev/null 2>&1 \
  && warn "l'utilisateur 'trailconnect' existe déjà — vérifie qu'il est bien à toi" \
  || ok "utilisateur 'trailconnect' libre"

for d in /opt/trailconnect /var/lib/trailconnect /etc/trailconnect /srv/git/trailconnect.git; do
  if [ -e "$d" ]; then
    warn "$d existe déjà ($(du -sh "$d" 2>/dev/null | cut -f1)) — inspecte avant d'écraser"
  else
    ok "$d libre"
  fi
done

UNITS=$(systemctl list-unit-files 2>/dev/null | grep -c '^trailconnect' || true)
[ "${UNITS:-0}" -gt 0 ] \
  && warn "$UNITS unité(s) systemd 'trailconnect*' déjà installée(s)" \
  || ok "aucune unité systemd en conflit"

# ── Pare-feu ─────────────────────────────────────────────────────────────────
head_ "Pare-feu"

if have ufw; then
  UFW=$($SUDO ufw status 2>/dev/null | head -1)
  printf '  ufw : %s\n' "${UFW:-état inconnu}"
  if printf '%s' "$UFW" | grep -qi active; then
    $SUDO ufw status numbered 2>/dev/null | sed -n '3,12p' | sed 's/^/    /'
    note "vérifie que 80 et 443 restent ouverts si Caddy doit renouveler en HTTP-01"
  fi
else
  note "ufw absent"
fi

# ── Plan de réutilisation ────────────────────────────────────────────────────
head_ "Plan — ce qu'on réutilise, ce qu'on ajoute"

if [ "$NEED_DNS" = "?" ]; then
  if [ "$CERTS_EXIST" = "yes" ]; then
    NEED_DNS="non — HTTP-01 fonctionne déjà"
  else
    NEED_DNS="seulement si les ports 80/443 ne sont pas ouverts (voir §0b)"
  fi
fi

echo "  Rien de ce qui est déjà installé n'est remplacé, mis à jour ou reconfiguré."
echo
printf '  %-22s %s\n' "Node 22"    "$INSTALL_NODE"
[ -n "$NODE_NOTE" ] && printf '  %-22s → %s\n' "" "$NODE_NOTE"
printf '  %-22s %s\n' "pnpm"       "non — 'corepack pnpm' résout la version épinglée, sans shim global"
printf '  %-22s %s\n' "Base"       "$INSTALL_DB"
printf '  %-22s %s\n' "Caddy"      "$INSTALL_CADDY"
printf '  %-22s %s\n' "Module DNS" "$NEED_DNS"
printf '  %-22s %s\n' "Port app"   "$PORT_PICK"
if [ "$TZ_ISOLATE" = "yes" ]; then
  printf '  %-22s %s\n' "Fuseau" "isolé (TZ=UTC + ?timezone=Z) — machine inchangée"
else
  printf '  %-22s %s\n' "Fuseau" "déjà UTC — rien à faire"
fi

echo
echo "  Ce que la procédure n'a le droit de toucher à AUCUN moment :"
echo "    · /etc/caddy/Caddyfile        → on y ajoute une seule ligne 'import', c'est tout"
echo "    · la configuration MySQL      → aucun réglage global, pas de redémarrage"
echo "    · le fuseau horaire système   → isolé au niveau du service"
echo "    · le Node/pnpm des autres     → jamais remplacés"
echo "    · les bases existantes        → on en crée une nouvelle, à côté"
echo "    · /etc/sudoers                → on ajoute un fichier dans /etc/sudoers.d/"

if [ "$CADDY_SHARED" = "yes" ]; then
  echo
  echo "  Sauvegardes à prendre avant de commencer :"
  echo "    sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-\$(date +%F)"
fi

echo
echo "  Tout se désinstalle en supprimant : l'unité systemd, /opt/trailconnect,"
echo "  /var/lib/trailconnect, /etc/trailconnect, la base 'trailconnect',"
echo "  /etc/caddy/sites/trailconnect.caddy et l'utilisateur 'trailconnect'."

# ── Verdict ──────────────────────────────────────────────────────────────────
head_ "Verdict"

printf '  %s point(s) bloquant(s), %s point(s) à adapter\n' "$STOPS" "$WARNS"
if [ "$STOPS" -gt 0 ]; then
  echo
  echo "  Traite les [STOP] avant d'installer quoi que ce soit."
  exit 2
elif [ "$WARNS" -gt 0 ]; then
  echo
  echo "  Aucun blocage. Adapte la procédure aux [WARN] ci-dessus."
  exit 0
else
  echo
  echo "  Machine propre — la procédure standard s'applique telle quelle."
  exit 0
fi
