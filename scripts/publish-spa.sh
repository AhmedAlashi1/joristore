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
rsync -av "$SPA/" "$ROOT/public/"
echo "SPA published to public_html (store) and joristore/public (dashboard)."
