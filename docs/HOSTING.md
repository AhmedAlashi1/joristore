# Sport World PS — production layout

## Domains

| Role | URL | Document root (typical cPanel) |
|------|-----|--------------------------------|
| **Storefront (React PWA)** | https://sportsworldps.com | `~/public_html` ← contents of `public/spa` after `npm run build` |
| **Laravel (API + admin + uploads)** | https://dashboard.sportsworldps.com | `~/joristore/public` after `git clone` (document root **must** be `public/`) |

If `POST /api/admin/login` returns **404** but `POST /index.php/api/admin/login` works, enable **mod_rewrite** / point the subdomain to `public/`, or set  
`VITE_API_BASE_URL=https://dashboard.sportsworldps.com/index.php/api` before `npm run build`.

- **Admin:** https://dashboard.sportsworldps.com/admin  
- **Partner portal:** https://sportsworldps.com/partner/login  
- **API:** https://dashboard.sportsworldps.com/api  
- **Uploaded files:** https://dashboard.sportsworldps.com/storage/...

Opening `/admin` on **sportsworldps.com** redirects to **dashboard** in production builds.

## Laravel `.env` (on server)

```env
APP_URL=https://dashboard.sportsworldps.com
```

Run `php artisan storage:link` once. Files live under `storage/app/public/…`, URL prefix `/storage/…`.

## Frontend build (store + admin in one SPA)

From `frontend/`:

```bash
cp .env.production.example .env.production   # optional; repo .env.production is pre-filled
npm ci
npm run build
rsync -av ../public/spa/ ~/public_html/
```

Recommended production env (`frontend/.env.production`):

```env
VITE_API_BASE_URL=https://dashboard.sportsworldps.com/index.php/api
VITE_BACKEND_ORIGIN=https://dashboard.sportsworldps.com
VITE_STORE_SLUG=jori-store
```

Change `VITE_STORE_SLUG` if your store slug in the database is different.

## Deploy checklist

1. `git pull` on `~/joristore`
2. `php artisan migrate --force` · `config:clear` · `cache:clear`
3. Build and publish the **same** SPA to **both** hosts:

```bash
cd ~/joristore/frontend && npm ci && npm run build

# Storefront (sportsworldps.com)
rsync -av ~/joristore/public/spa/ ~/public_html/

# Dashboard (Laravel — /admin + /assets; do NOT leave public/index.html or `/` shows the shop)
rsync -av --exclude index.html ~/joristore/public/spa/ ~/joristore/public/
mkdir -p ~/joristore/public/spa
rsync -av ~/joristore/public/spa/index.html ~/joristore/public/spa/
```

Or: `bash scripts/publish-spa.sh` from the repo root.

Without assets in `public/`, `/admin` **404**s. With `public/index.html`, `/` shows the **storefront** instead of admin login.

4. Confirm logo URL returns `Content-Type: image/jpeg`, not `text/html`

## First deploy (clone — no `~/joristore` yet)

On the server (SSH):

```bash
cd ~
git clone https://github.com/AhmedAlashi1/joristore.git joristore
cd ~/joristore
```

SSH key (optional, no password each pull):

```bash
git clone git@github.com:AhmedAlashi1/joristore.git joristore
```

Then Laravel + frontend (once):

```bash
cd ~/joristore
cp .env.example .env
nano .env   # DB_*, APP_URL=https://dashboard.sportsworldps.com

php ~/composer.phar install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan storage:link

cd ..
# Shared hosting often has no `npm` in SSH — repo already includes `public/spa` after git pull:
bash scripts/publish-spa.sh

# To rebuild on server (needs Node via cPanel "Setup Node.js App" or nvm):
# cd frontend && cp .env.production.example .env.production && npm ci && npm run build && cd .. && bash scripts/publish-spa.sh
```

**cPanel:** point subdomain `dashboard` document root to **`/home/USER/joristore/public`** (replace `USER` with your cPanel username).

## DNS (new hosting)

| Record | Name | Points to |
|--------|------|-----------|
| A or CNAME | `@` | server IP / main host |
| A or CNAME | `www` | same as `@` (optional) |
| A or CNAME | `dashboard` | same server (subdomain for Laravel `public/`) |

In cPanel: create subdomain **dashboard** → document root `joristore/public` (not the repo root).

## Local development

```bash
php artisan serve --host=127.0.0.1 --port=8000
cd frontend && npm run dev
```

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:5173 | Store + admin UI |
| http://127.0.0.1:5173/admin/login | Admin login |
| http://127.0.0.1:8000 | JSON API only (not the shop UI) |

Vite proxies `/api` and `/storage` to port 8000. **Do not** open the shop on `:8000` unless `public/index.html` exists.

## If store is empty or admin login fails

On the server:

```bash
cd ~/joristore
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan optimize:clear
```

Rebuild and publish SPA (see checklist above). In the browser: hard refresh or clear site data for sportsworldps.com and dashboard.

Check API: `curl -s -o /dev/null -w "%{http_code}" -H "X-Store-Slug: jori-store" https://dashboard.sportsworldps.com/index.php/api/store` → **200**.
