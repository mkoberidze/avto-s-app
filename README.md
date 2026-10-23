# SENTRA

Georgian-only B2B shop. Catalog is synced from the Neotech JSON feed (`catalog:sync`). Customers request orders (no payment). Admins manage orders, catalog flags, settings, and contact messages.

See [docs/DEPLOY.md](docs/DEPLOY.md) for production.

## Local setup (Sail)

```bash
cp .env.example .env
# SMS_DRIVER=log so OTP does not call ubill
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
./vendor/bin/sail artisan db:seed
./vendor/bin/sail npm install
./vendor/bin/sail npm run dev
```

On Fedora/SELinux the app bind mount may need `:Z` on the volume (local `docker-compose.yml` only). App URL is `APP_URL` / `APP_PORT` (often http://127.0.0.1:8080).

Set in `.env`:

- `SMS_DRIVER=log` — OTP and admin SMS go to the log; no ubill network
- `ADMIN_PHONE` / `ADMIN_PASSWORD` — `db:seed` creates that admin user
- Optional local feed snapshots:

```
NEOTECH_PRODUCTS_URL=/var/www/html/storage/app/feed/products.json
NEOTECH_CATEGORIES_URL=/var/www/html/storage/app/feed/category.json
```

Then:

```bash
./vendor/bin/sail artisan catalog:sync
```

Without snapshots, sync uses https://shop.neotech.ge/data/products.json and `category.json` (may 403 if your IP is not whitelisted).

## Tests

```bash
./vendor/bin/sail artisan test
# or: php artisan test
```

`phpunit.xml` sets `SMS_DRIVER=ubill` so SMS-failure tests hit the HTTP fake, independent of your `.env`.

## Useful commands

- `php artisan catalog:sync`
- `php artisan app:doctor` / `php artisan app:doctor --feeds-only`
- `php artisan legacy:export` — dump `forms` and `pages` rows (tables are kept)
