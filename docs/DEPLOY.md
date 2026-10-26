# Deploy SENTRA to Proservice DirectAdmin

Shared hosting: **cron only**, no queue worker. `QUEUE_CONNECTION=sync`. Document root must be the Laravel `public` directory.

## What this repo already does

`.github/workflows/deploy.yml` runs on push to `main`:

1. PHP 8.3 + `composer install --no-dev --optimize-autoloader --no-interaction`
2. Node 22 + `npm ci` + `npm run build`
3. Splits the tree into two FTP uploads:
   - `./laravel/` — application (vendor, `app/`, etc.). `public/build/` is **excluded** here.
   - `./sentra.ge/public_html/` — contents of `public/` **including** the Vite `build/` assets.

Secrets the workflow expects (never commit them): `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`.

If you deploy by hand instead of the workflow, still run `npm run build` locally and upload `public/build/` with the public files.

## First-time host setup

Confirm on the host: PHP **8.2+**, extensions `pdo_mysql`, `mbstring`, `openssl`, `curl`, `dom`, `fileinfo`, `json`, `ctype`, `xml`, and that the domain’s document root points at **`…/public`** (or the uploaded `public_html` that already is that document root).

1. Copy `.env.production.example` to `.env` on the server. Fill `APP_URL`, MySQL keys, `UBILL_*`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, `ADMIN_PHONES`. No sample secrets are in the template.
2. From the Laravel root (the `laravel/` directory if using the FTP layout):

```bash
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
```

`db:seed` creates admin users from `ADMIN_PHONE`, `ADMIN_PHONES`, and `ADMIN_PASSWORD`. Extra shop-contact admins also get the role on OTP login.

3. Storage link:

```bash
php artisan storage:link
```

If the host blocks symlinks, confirm the alternative with DirectAdmin: create `public/storage` as a directory and serve files from `storage/app/public` (order attachments are **not** on the public disk; only logos/carousel/favicon are).

4. Permissions (typical): `storage/` and `bootstrap/cache/` writable by the PHP user.

5. Cron (one line, every minute):

```
* * * * * php /path/to/laravel/artisan schedule:run
```

Replace `/path/to/laravel` with the real path on the host. The schedule currently runs `catalog:sync` hourly.

## First run order

1. `php artisan app:doctor` — fix every `FAIL`. `WARN` on `APP_DEBUG`/`APP_ENV` should not appear in production. HTTP **403** on the Neotech feeds means this server IP is not whitelisted.
2. `php artisan catalog:sync` — or point `NEOTECH_*_URL` at local JSON snapshots first if the live feed is blocked.
3. Open `/api/products` and `/` in a browser.

Optional: `php artisan legacy:export` writes `storage/app/exports/legacy-YYYYMMDD-HHMMSS.json` (old forms + CMS pages). Tables are not dropped.

## Rollback

- **Code:** redeploy the previous `main` artifact (FTP upload of the last known good tree). Do not `migrate:rollback` unless you intend to reverse a specific migration you just added.
- **This release’s migrations** add `contact_messages` and `orders.attachment_path` / `attachment_name`. They do **not** drop `forms` or `pages`. Rolling them back removes the new contact table and the new order columns only.
- Keep a copy of `.env` and of `storage/` (private order files live under `storage/app/orders/`).

## Post-deploy smoke test

- Home, catalog, product, cart, login (OTP SMS), checkout, account
- `/forms` and `/services` redirect to `/`
- Contact form (check admin **Messages**)
- Place an order with an attachment; download as owner and as admin; a second user must get 404; `/storage/…` must not serve the new file
- Admin dashboard, orders, products, categories, settings
- `GET /api/products` returns Georgian names
