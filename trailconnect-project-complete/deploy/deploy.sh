#!/usr/bin/env bash
#
# Deploys the revision currently in the bare repo to /opt/trailconnect.
#
# Run it as your own login user (not the service user): it needs to write the
# working tree and node_modules, while the service itself only ever reads them.
#
#   trailconnect-deploy            # deploy main
#   trailconnect-deploy some-branch
set -euo pipefail

REPO=/srv/git/trailconnect.git
TREE=/opt/trailconnect
BRANCH=${1:-main}
ENV_FILE=/etc/trailconnect/env

[ -r "$ENV_FILE" ] || { echo "Cannot read $ENV_FILE — are you in the trailconnect group?" >&2; exit 1; }

echo "==> Checking out $BRANCH"
git --git-dir="$REPO" --work-tree="$TREE" checkout -f "$BRANCH"
git --git-dir="$REPO" --work-tree="$TREE" clean -fd -e node_modules -e var

cd "$TREE"

# `corepack pnpm` resolves the version pinned in package.json without installing
# a global shim, so nothing else on this machine sees a new or different pnpm.
# Override with PNPM=... if you deliberately want another one.
PNPM=${PNPM:-"corepack pnpm"}

# Honour a Node pinned for this app alone (fnm, nvm, /opt/node-22/bin) so a
# shared machine keeps whatever Node its other services rely on.
if [ -n "${NODE_BIN_DIR:-}" ]; then
  PATH="$NODE_BIN_DIR:$PATH"
  export PATH
fi

# The build bakes VITE_* into the bundle, so the secrets have to be present at
# build time and not just at runtime. Vite picks them up from the process
# environment, which is why they are exported rather than read from a file.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

echo "==> Installing dependencies"
$PNPM install --frozen-lockfile

echo "==> Applying migrations"
# `migrate` only, never `generate`: generate can prompt on a column rename, and
# a prompt in a deploy script hangs forever.
$PNPM exec drizzle-kit migrate

echo "==> Building"
$PNPM run build

echo "==> Restarting"
sudo systemctl restart trailconnect

# Give it a moment to bind, then prove it actually answers.
for _ in $(seq 1 15); do
  sleep 1
  if curl -fsS "http://127.0.0.1:${PORT:-3000}/healthz" >/dev/null 2>&1; then
    echo "==> Deployed: $(git --git-dir="$REPO" rev-parse --short "$BRANCH")"
    exit 0
  fi
done

echo "Service did not become healthy. Recent logs:" >&2
journalctl -u trailconnect -n 40 --no-pager >&2
exit 1
