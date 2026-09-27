# Jori Store — production layout

## Domains

| Role | URL | Document root (typical cPanel) |
|------|-----|--------------------------------|
| **Storefront (React PWA)** | https://joristore.com | `~/public_html` ← contents of `public/spa` after `npm run build` |
| **Laravel (API + admin + uploads)** | https://dashboard.joristore.com | `~/joristore/public` (document root **must** be `public/`) |

If `POST /api/admin/login` returns **404** but `POST /index.php/api/admin/login` works, enable **mod_rewrite** / point the subdomain to `public/`, or set  
`VITE_API_BASE_URL=https://dashboard.joristore.com/index.php/api` before `npm run build`.

- **Admin:** https://dashboard.joristore.com/admin  
- **API:** https://dashboard.joristore.com/api  
- **Uploaded files:** https://dashboard.joristore.com/storage/...

Opening `/admin` on **joristore.com** redirects to **dashboard** in production builds.

## Laravel `.env` (on server)

```env
APP_URL=https://dashboard.joristore.com
```

Run `php artisan storage:link` once. Files live under `storage/app/public/…`, URL prefix `/storage/…`.

## Frontend build (store + admin in one SPA)

From `frontend/`:

```bash
cp .env.production.example .env.production   # optional; defaults work for joristore.com
npm ci
npm run build
rsync -av ../public/spa/ ~/public_html/
```

Recommended production env (`frontend/.env.production`):

```env
VITE_API_BASE_URL=https://dashboard.joristore.com/api
VITE_BACKEND_ORIGIN=https://dashboard.joristore.com
VITE_STORE_SLUG=jori-store
```

If unset, the app still uses **dashboard** for API and `/storage` when the site is opened on **joristore.com**.

## Deploy checklist

1. `git pull` on `~/joristore`
2. `php artisan migrate --force` · `config:clear` · `cache:clear`
3. Build and publish the **same** SPA to **both** hosts:

```bash
cd ~/joristore/frontend && npm ci && npm run build

# Storefront (joristore.com)
rsync -av ~/joristore/public/spa/ ~/public_html/

# Dashboard (Laravel — /admin + /assets; do NOT leave public/index.html or `/` shows the shop)
rsync -av --exclude index.html ~/joristore/public/spa/ ~/joristore/public/
mkdir -p ~/joristore/public/spa
rsync -av ~/joristore/public/spa/index.html ~/joristore/public/spa/
```

Or: `bash scripts/publish-spa.sh` from the repo root.

Without assets in `public/`, `/admin` **404**s. With `public/index.html`, `/` shows the **storefront** instead of admin login.

4. Confirm logo URL returns `Content-Type: image/jpeg`, not `text/html`

## Local development

```bash
php artisan serve --port=8000
cd frontend && npm run dev
```

Uses Vite proxy to `127.0.0.1:8000` for `/api` and `/storage`.
