#!/usr/bin/env bash
# Copy public/spa to storefront + dashboard docroots. Builds with npm when available.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPA="$ROOT/public/spa"

if [[ "${SKIP_NPM_BUILD:-0}" != "1" ]] && command -v npm >/dev/null 2>&1; then
  cd "$ROOT/frontend"
  npm run build
elif [[ ! -f "$SPA/index.html" ]]; then
  echo "ERROR: npm not found and $SPA/index.html is missing."
  echo "Either: install Node (cPanel → Setup Node.js App), or git pull (repo includes a built SPA), or build locally and push public/spa."
  exit 1
else
  echo "Skipping npm build — publishing existing public/spa (from git or prior build)."
fi

if [[ -d "$HOME/public_html" ]]; then
  rsync -av "$SPA/" "$HOME/public_html/"
fi
# Dashboard: assets + spa shell, but NOT public/index.html (so `/` hits Laravel → /admin/login)
rsync -av --exclude index.html "$SPA/" "$ROOT/public/"
mkdir -p "$ROOT/public/spa"
rsync -av "$SPA/index.html" "$ROOT/public/spa/"
echo "SPA published: public_html=full store; joristore/public=admin assets (no root index.html)."
