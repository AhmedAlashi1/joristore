#!/usr/bin/env bash
# Build frontend and copy public/spa to storefront + dashboard docroots.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
npm run build
SPA="$ROOT/public/spa"
if [[ -d "$HOME/public_html" ]]; then
  rsync -av "$SPA/" "$HOME/public_html/"
fi
# Dashboard: assets + spa shell, but NOT public/index.html (so `/` hits Laravel → /admin/login)
rsync -av --exclude index.html "$SPA/" "$ROOT/public/"
mkdir -p "$ROOT/public/spa"
rsync -av "$SPA/index.html" "$ROOT/public/spa/"
echo "SPA published: public_html=full store; joristore/public=admin assets (no root index.html)."
