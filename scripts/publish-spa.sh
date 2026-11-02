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
  if [[ -f "$SPA/api-laravel.php" ]]; then
    cp -f "$SPA/api-laravel.php" "$HOME/public_html/api-laravel.php"
  elif [[ -f "$ROOT/frontend/public/api-laravel.php" ]]; then
    cp -f "$ROOT/frontend/public/api-laravel.php" "$HOME/public_html/api-laravel.php"
  fi
fi
# Dashboard: assets only — never overwrite Laravel index.php / .htaccess (store SPA rules break /admin)
rsync -av \
  --exclude index.html \
  --exclude api-laravel.php \
  --exclude .htaccess \
  --exclude index.php \
  "$SPA/" "$ROOT/public/"
rm -f "$ROOT/public/api-laravel.php"
if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$ROOT" checkout -- public/.htaccess 2>/dev/null || true
fi
mkdir -p "$ROOT/public/spa"
rsync -av "$SPA/index.html" "$ROOT/public/spa/"

rm -f "$ROOT/public/index.html"

if [[ ! -f "$ROOT/public/index.php" ]]; then
  echo "ERROR: missing $ROOT/public/index.php — Laravel cannot serve /admin or /api."
  echo "Run: cd $ROOT && git checkout public/index.php public/.htaccess"
  exit 1
fi

echo "SPA published: public_html=store; joristore/public=admin (/ → /admin/login)."
