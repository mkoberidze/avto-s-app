# Sentra rework analysis (Figma Make → Laravel/React)

Read-only analysis. Figma Make source: `OV25rl8Jd6pYY5bKUY5Jbq` (App.tsx, api.ts, routes, store, i18n, pages). Live catalog sampled 2026-10-12 via `https://sentra.ge/api/check-up` (products) and `https://sentra.ge/api/check-ip` (categories). Local `routes/web.php` does **not** currently expose those proxies (see E/F).

---

## A. Summary

Rework Sentra from a bilingual service-request SPA into a trilingual (KA/EN/RU) B2B e-commerce storefront matching the Figma Make design: catalog, product detail, cart, phone-OTP checkout as an **order request** (no payment), account order history, and an admin for orders/catalog/settings. Keep Sanctum bearer tokens in `localStorage.auth_token`. Stop serving the shop from raw JSON; cron `catalog:sync` upserts the Neotech feed into our tables, overwriting feed-owned columns and generating EN/RU translations once. Reuse OTP + SMS-to-admins. Shared hosting: cron only, no queue workers. Retire the public fire/cctv/access **forms wizard**; replace admin kanban with orders. Figma is a mocked prototype (localStorage, demo OTP `123456`, demo admin login) — do not copy those shortcuts.

---

## B. Frontend comparison

Figma routes (`src/app/routes.tsx`): `/`, `/products`, `/products/category/:id`, `/products/:id`, `/cart`, `/checkout`, `/login`, `/account`, `/about`, `/contact`, `/admin/:section?`, `*` 404. Admin is **outside** the storefront layout. State: `LanguageProvider` (ka/en/ru, `sentra_language`) + `StoreProvider` (in-memory cart + drawer). **No AuthContext** — pages call `getMe()`. Existing app: `AuthProvider` + `LanguageProvider` (ka/en, `lang`) + `PhoneAuthModal` global.

| Figma page / feature | Closest existing | Status | Notes |
|---|---|---|---|
| `/` Home: hero carousel, 3 category cards, featured 4 products, trust strip | `LandingPage.jsx` + `Carousel.jsx` | **REPLACE** | Keep settings-driven carousel URLs; copy/CTA/layout from Figma. Featured = first N products (no `featured` flag in feed). |
| Header: search, lang KA/EN/RU, account, cart badge, category mega menu | `Navbar.jsx` | **REPLACE** | Add search, cart, 3 langs, footer. Keep logo from `GET /api/settings`. |
| Footer | none | **NEW** | Figma hardcodes phone `+995 32 2 11 22 33`, `info@sentra.ge`. |
| Cart drawer | none | **NEW** | Client-only cart is fine for v1 (not persisted). |
| `/products` + `/products/category/:id` catalog, filters, sort, load-more | none | **NEW** | Brand list in Figma is hardcoded (Bosch, Hikvision, …). Feed has **63 brands** via `features.ბრენდი`. Filters must come from API. |
| `/products/:id` gallery, qty, specs, documents tab, related | none | **NEW** | Documents tab is placeholder copy. Related = same `category_id`, client-side. |
| `/cart` | none | **NEW** | |
| `/checkout` order request (name, phone, address, comment, file) | `FormsPage.jsx` wizard | **REPLACE** (concept) | Same “request + attachment + SMS admin” idea; payload is line items, not fire/cctv/access. Auth required (redirect `/login`). |
| `/login` dedicated OTP page | `PhoneAuthModal.jsx` | **MODIFY** | Keep modal optional; Figma uses a page. Keep GE `+995` / `5XXXXXXXX`. Do not ship demo code `123456`. |
| `/account` profile name + order history | `/forms` list | **NEW** / **REPLACE** | Profile save in Figma is localStorage only — needs `PATCH /api/user`. |
| `/about` | `AboutPage.jsx` + CMS `pages` | **MODIFY** | Figma is static i18n strings, not CMS. Either keep CMS with RU columns or freeze Figma copy in i18n. |
| `/contact` form (name, phone, email, message) | nav.contact unused; services/about CMS | **NEW** | Figma submit is client-only (`setSent(true)`). Need endpoint or reuse SMS. |
| `/admin` dashboard / products / orders / settings | `AdminPanel`, `AdminFormDetail`, `AdminPagesEditor`, `AdminSettings` | **REPLACE** UI | Keep Sanctum `role:admin`. Do **not** implement `signInAdminDemo`. Product CRUD conflicts with feed overwrite (see C, H). |
| i18n 2 → 3 langs | `i18n.js` + `LanguageContext.jsx` | **MODIFY** | UI: add `ru` dictionary (Figma already has full keys). Stop forcing `toUpper()` on all strings. Content: product/category translations stored in DB, not i18n files. |
| CMS `/services` | `ServicesPage.jsx` | **REMOVE** from public nav | Figma has no services route; categories replace it. |
| `/forms`, `/forms/:id` | Forms wizard + detail | **REMOVE** public | See D. |
| `ProtectedRoute` | existing | **MODIFY** | Use on checkout/account/admin; Figma admin already gates on `role === "admin"`. Re-enable commented admin redirect. |
| Auth token flow | `AuthContext.jsx` | **REUSE** | Keep `auth_token` + Bearer. Wire Figma `getMe`/`logout` through it. |

Figma components to port (new design system: navy/accent, lucide icons): `layout.tsx` (Header, Footer, CartDrawer, LanguageSwitcher), `ui.tsx` (Button, Price, StockBadge, QuantityStepper, ProductCard, CartLines, EmptyState, skeletons). Existing `AttachmentPreview` can reuse on admin order detail if you add that screen (Figma admin table has no order-detail page).

Content vs UI translation: UI chrome lives in frontend dictionaries (`i18n.tsx` / `i18n.js`). Product name/description/features and category names live in DB JSON, chosen by `?language=ka|en|ru`. CMS pages (if kept) need `_ru` columns. Do not call a translator on each request.

---

## C. API contract diff

Figma `api.ts` is a **mock**: `delay(280ms)`, localStorage admin edits, Unsplash heroes. Auth header is built but unused. Language is a function argument (`language?: Language`), not a header.

### Feed → Figma `Product` mapping (live feed)

`GET https://sentra.ge/api/check-up` → **1581** products. Shape:

```
category_id, product_id, product_code, product, short_description (HTML),
full_description (HTML), amount (""|"*"|"**"|"***"|"****"),
in_stock ("0"|"1"), price ("16.00"), features (object|rarely not a dict),
images: string[] (neotech CDN, 1–6)
```

| Figma field | Feed | Serve as |
|---|---|---|
| `id` | `product_id` | string of feed id |
| `product_code` | `product_code` | as-is (unique in sample) |
| `category_id` | `category_id` | **numeric string**, not `fire`/`cctv`/`access` |
| `name` | `product` (KA) | localized from `translations` JSON |
| `short_description` | `short_description` HTML, **260 empty** | strip HTML for cards; translate once |
| `description` | `full_description` HTML, **225 empty** | keep HTML or convert; fallback to short |
| `price` | string decimal | `number` |
| `in_stock` | `"0"`/`"1"` | boolean |
| `stock_level` | `amount`; also **`****` (70)** | Figma type omits `****` — extend union |
| `brand` | **`features["ბრენდი"]`**, 6 missing, 63 values | denormalize column at sync |
| `features` | 37 KA keys (მწარმოებელი, IP/Analog, …); 3 products not a dict | store raw + translated keys/values |
| `images` | always present | keep remote URLs or cache (H) |

**Not in feed (Figma UI assumes them):**

| Assumed | Where it would come from |
|---|---|
| `sort=newest` | **No timestamp.** Proxy: `product_id` desc, or `synced_at` / first-seen column we add. |
| Related products | Same `category_id`, exclude self, limit 4 (as Figma client). |
| Documents / PDFs | **Nowhere.** Keep placeholder until a `product_documents` table or CMS upload. |
| Featured products | **No flag.** Home: latest-in-stock or curated `is_featured` (our column, sync must not touch). |
| Brand filter list | `GET /api/brands` distinct, not hardcoded Bosch/Honeywell. |
| 3 mega-categories fire/cctv/access | Feed has **20 roots, 136 nodes**, 21 product category_ids **missing** from category list, parent `125` orphan. Map or hide; do not collapse to 3 without a mapping table. |
| Admin create/delete products | Feed is source of truth. Creates would be wiped/orphaned; deletes should be `is_hidden`, not destroy. |

Categories (`check-ip`): `{ category_id, parent_id ("0"=root), category }` KA only. Figma `Category` is `{ id, parent_id, name }` — match after localization. Tree is deeper than Figma’s 3 flat links.

### Function-by-function

| `api.ts` | Laravel | Exists? | Request / response changes |
|---|---|---|---|
| `getSettings()` → `{ logo_url, carousel_images[] }` | `GET /api/settings` | **Yes** | Today: KV bag; `carousel_images` is a **JSON string**. Normalize to `{ logo_url, favicon_url, carousel_images: string[], store_name?, contact_email?, delivery_note?, phone? }`. Figma ignores favicon — keep it. |
| `getCategories(lang)` | **NEW** `GET /api/categories?language=` | No | Return tree or flat list with `parent_id`. Exclude hidden. Names localized. |
| `getProducts(params)` `{ category_id, q, brand[], min_price, max_price, in_stock, sort, page, language }` → `{ products, total }` | **NEW** `GET /api/products` | No | Mock ignores `page` (client slices 8 then +6). Implement **server** pagination (`page`, `per_page`) plus `total`. `sort`: `newest` (our rule), `priceAsc`, `priceDesc`, `name` (locale). Filter hidden. `q` on name/code/brand (all locales or current). `brand` from denormalized column. |
| `getProduct(id, language)` | **NEW** `GET /api/products/{id}` | No | 404 not `null`. Include `features`, `images`, localized fields. Related optional `?include=related` or separate call. |
| `requestOtp(phone)` → `{ success, expires_in: 600 }` | `POST /api/auth/otp/request` `{ phone }` | **Yes** | Align body. Stop returning ubill raw `response`. Return `{ status, expires_in }` only. Rate-limit. |
| `verifyOtp(phone, otp)` → `{ token, user }` | `POST /api/auth/otp/verify` | **Yes** | Already `{ token, user:{id,phone,name,role} }`. Reject demo `123456`. Role must be the **admin** name if assigned (see F). |
| `signInAdminDemo()` | — | **Do not implement** | Security hole. Admin uses same OTP. |
| `getMe()` | `GET /api/user` | **Yes** | Same user shape. Keep Sanctum. |
| `logout()` | `POST /api/auth/logout` | **Yes** | Existing deletes current token. |
| `createOrder(payload)` items + form | **NEW** `POST /api/orders` multipart | No | Do **not** trust client `product.price`. Send `{ items:[{product_id, quantity}], name, phone, address, comment, file? }`. Auth required. Snapshot price/name/code. Status `new`. SMS admins (reuse FormController SMS). Return `{ id, status, total }`. |
| `getMyOrders()` → `Order[]` | **NEW** `GET /api/orders` | No | `{ id, date, total, status }` for current user. Status enum: map Figma `new/underReview/inProgress/completed` → snake `new/under_review/in_progress/completed` (match existing forms). |
| `getAdminOrders()` → `AdminOrder[]` | **NEW** `GET /api/admin/orders` | No (forms analog exists) | Add `customer, phone, address, item_count`. Later: line items + attachment. |
| `updateOrderStatus(id, status)` | **NEW** `PUT /api/admin/orders/{id}/status` | Analog: forms status | Input snake_case. Return updated order, not the full list (Figma returns all — wasteful). |
| `saveProduct(input, id?)` | **NEW** `PUT /api/admin/products/{id}` | No | **Do not** allow overwriting feed-owned fields if sync would clobber them. Allow `is_hidden`, translation edits, optional `is_featured`. Creating products (`POST`) is optional/out of v1 unless “our” SKUs exist. Figma editor writes a **single** name/description (current UI language only) — backend must write into `translations.{lang}`. |
| `deleteProduct(id)` | **NEW** `POST /api/admin/products/{id}/hide` or PATCH `is_hidden` | No | Soft-hide. Hard delete fights the next sync. |
| Contact form | **NEW** `POST /api/contact` | No | Figma has no function. |
| Account `name` save | **NEW** `PATCH /api/user` `{ name }` | No | Figma writes `sentra_user` in localStorage. |
| Admin business settings | extend `POST /api/admin/settings` | Partial | Figma: storeName, contactEmail, deliveryNote in localStorage. Merge into settings KV. Keep logo/favicon/carousel uploads. |
| Brands for filters | **NEW** `GET /api/brands` | No | |

**Keep existing (storefront or admin CMS):** `GET /api/pages/{slug}`, admin page upsert — only if about/contact stay CMS-driven. Form CRUD can be deleted after migration.

**Delete:** production/local leak routes `/api/check-up`, `/api/check-ip` (see E).

---

## D. Database changes

### New tables

1. **`categories`**
   - `id` (use feed `category_id` as PK bigint)
   - `parent_id` nullable FK self
   - `name_ka` (feed `category`) **feed-owned**
   - `translations` JSON `{ en, ru }` **ours** (null until generated)
   - `is_hidden` bool default false **ours**
   - `synced_at`
   - Soft-missing parents: nullable `parent_id` if orphan `125`

2. **`products`**
   - `id` = feed `product_id` (bigint PK; sample 88–21598)
   - `product_code` unique **feed**
   - `category_id` FK nullable (21 ids missing from category list)
   - `name_ka`, `short_description_ka`, `description_ka` **feed** (store stripped or raw HTML — pick one)
   - `price` decimal **feed**
   - `in_stock` bool **feed**
   - `stock_level` string **feed** (allow `****`)
   - `brand` string nullable **feed** (from `ბრენდი`)
   - `features` JSON **feed** (KA keys)
   - `images` JSON **feed** (URLs)
   - `translations` JSON `{ en: {name, short_description, description, features}, ru: {...} }` **ours**
   - `is_hidden` bool **ours**
   - `is_featured` bool optional **ours**
   - `first_seen_at` / `synced_at` **ours/sync** (for newest)
   - Do **not** put EN/RU in columns that sync overwrites

3. **`orders`**
   - `id`, `user_id` FK, `status` enum/string (`new`,`under_review`,`in_progress`,`completed`)
   - `customer_name`, `phone`, `address`, `comment`, `attachment_url`
   - `total` decimal (server-computed)
   - timestamps

4. **`order_items`**
   - `order_id`, `product_id` nullable (if later deleted), `product_code`, `name_snapshot`, `price_snapshot`, `quantity`

### Existing tables

| Table | Change |
|---|---|
| `users` | Keep phone OTP. Optional: nothing else for v1. `name` already fillable. |
| `settings` | No schema change (KV). New keys: `store_name`, `contact_email`, `delivery_note`, `phone`. Keep `logo_url`, `favicon_url`, `carousel_images`. |
| `pages` | If CMS kept: add `title_ru`, `subtitle_ru`, `body_ru`; sections need `title_ru`/`body_ru`. If about/contact are i18n-only, freeze pages admin. |
| `forms` | **Retire.** Public wizard is not in Figma. Checkout + contact replace it. |

### Forms wizard / admin screens — recommendation

**Remove** public `/forms` and the three-step direction wizard. **Do not** reuse `forms` rows as shop orders (different payload). **Replace** admin kanban with Figma orders table (same four statuses, slightly renamed `unopened` → `new`). Optionally one-time script: archive old forms or map each form to a zero-item order with comment = `input_two` for history. `FormController` SMS helper moves to an `OrderObserver` / `OrderService`.

### Migration order

1. `create_categories_table`
2. `create_products_table` (FK categories nullable)
3. `create_orders_table`
4. `create_order_items_table`
5. `add_ru_columns_to_pages_table` (only if CMS stays)
6. Do **not** drop `forms` in the same release; add `drop_forms_table` after a deploy that no longer writes forms

---

## E. Backend work

**Models:** `Category`, `Product`, `Order`, `OrderItem`. Keep `User`, `Setting`, `Page`. Deprecate `Form`.

**Controllers:** `ProductController` (index/show), `CategoryController`, `BrandController`, `OrderController` (store, index mine), `AdminOrderController`, `AdminProductController` (hide/translations/featured), `ContactController`, `UserController@update`. Keep `AuthController` (tighten), `SettingsController` (typed JSON). Remove or stop using `FormController` / `AdminController` forms.

**Command:** `catalog:sync` (scheduled).

- HTTP GET feed URLs from config (`NEOTECH_PRODUCTS_URL`, `NEOTECH_CATEGORIES_URL`). Until proxies die, those can be the neotech.json URLs **or** temporary sentra proxies — **not** public unauthenticated shop APIs long-term.
- Upsert categories then products.
- Overwrite feed-owned columns only.
- If `translations.en` / `translations.ru` empty (or name_ka changed vs hash), translate **once** (KA → EN, KA → RU) for name, short, full, feature keys/values, category names.
- Mark products absent from feed: `in_stock=false` or `is_hidden` — decide (H). Do not delete (orders snapshot still need names).
- Sync **inside the artisan process** (`ShouldBeUnique`, no `ShouldQueue`). Shared hosting: DirectAdmin cron `php artisan catalog:sync` nightly/hourly. Set `QUEUE_CONNECTION=sync` in production so nothing sits in `jobs`.
- Time/memory: 1581 products + HTML + translation API — batch, increase PHP `max_execution_time` on CLI only.

**Translation service:** one class wrapping a provider (OpenAI/DeepL/Google). Config keys in `config/services.php`. Idempotent: skip if hash(`name_ka`+descriptions) matches stored `source_hash`.

**Config:** `config/catalog.php` (feed URLs, timeout, brand feature key `ბრენდი`). Cron in `routes/console.php` `Schedule::command('catalog:sync')->hourly();` (cron entry must call `artisan schedule:run`).

**Routes to delete:** `/api/check-up`, `/api/check-ip`. In **this repo** `web.php` only has a dead `Route::get('/api/check-ip')` **after** the SPA catch-all (never runs locally; returns `'test'`). Production sentra.ge currently **does** proxy the full catalog on those URLs (unauthenticated, ~14MB products). Remove after sync exists. Catch-all already excludes `api`/`storage`.

**Other:** `GET /api/check-ip` in web.php is unused junk. Health remains `/up`.

---

## F. Auth and security (fix during rework)

1. **OTP request leaks SMS provider body** (`AuthController::requestOtp` returns `'response' => $response`) and tells clients to “check the otps table”. Return generic success only.
2. **Ubill API key in GET query string** via `file_get_contents`. Prefer POST; never log the full URL; don’t echo it.
3. **No OTP rate limit / CAPTCHA** — SMS pumping. Throttle by phone + IP (`throttle:5,1`).
4. **`verifyOtp` always `assignRole('user')` if missing.** Admins seeded with `admin` then also get `user`. `getRoleNames()->first()` is **undefined order** — UI `hasRole('admin')` compares `user.role === 'admin'` and can fail. Return `roles[]` or prefer `admin` if present. Do not attach `user` to admins.
5. **Admin UI gate commented out** in `AdminPanel.jsx`. API has `role:admin`; UI still loads for any logged-in user (403 on fetch). Restore redirect. Figma admin gate is correct; **ban** `signInAdminDemo`.
6. **Users can `PUT /api/forms/{id}` including `status`** — privilege on their own requests. Don’t copy that onto orders; customers must not set status.
7. **Leaky/dead routes:** production catalog proxies are a full unauthenticated dump (DoS + competitor scrape). Local misplaced `/api/check-ip`.
8. **Sanctum tokens never expire** (`expiration => null`). Set TTL. Logout only deletes current token.
9. **OTP created before SMS succeeds**; user row created on request (enumeration via `user_exists`). Drop `user_exists` from response.
10. **Checkout must be auth’d** (Figma does this). Validate quantities vs `in_stock`. Recalculate totals server-side.
11. **Image hotlinking** to `shop.neotech.ge` — mixed-content/availability; consider storing copies (hosting disk!).
12. **`Auth::login($user)` on API OTP** mixes session + token; SPA only needs token.

---

## G. i18n plan

**UI strings:** port Figma `translations` ka/en/ru into `resources/js` (replace uppercase-only `i18n.js`). Persist `localStorage` key `sentra_language` (or keep `lang` and migrate). Switcher: three codes, not toggle.

**Catalog content:** KA = feed columns. EN/RU = `translations` JSON filled at sync. API: `?language=ka|en|ru` (Figma’s contract). Fallback: requested → ka. Do not use `Accept-Language` unless also accepted as alias.

**Features:** keys are Georgian (`ბრენდი`, `რეზოლუცია`). Translate key and value at sync; API returns already-localized `features` object for the requested language (Figma UI prints keys as labels).

**Categories:** same pattern (`name_ka` + translations).

**CMS pages:** if kept, add RU fields and pick `title_{lang}` in `PageController` via query param; today frontend picks `title_ka` vs `title_en` itself.

**Admin product editor:** Figma has one name field — add language tabs or only edit “our” translations, not KA feed name (or editing KA is pointless because sync overwrites).

**Lang → API:** axios interceptor: `params.language = currentLang` (and `Accept-Language` optional). Cart holds product objects already localized; if user switches language with items in cart, re-fetch or keep snapshot (H).

---

## H. Risks and unknowns

- **Feed vs Figma IA:** Figma pretends three categories (fire/cctv/access). Real tree has 20 roots (CCTV, fire, access, AJAX, EZVIZ, cables, …). Home cards and nav must use **real** roots (or a curated subset via `is_hidden` / a `nav_order` column). Hardcoding fire/cctv/access breaks the catalog.
- **Missing category FKs:** 21 product `category_id`s not in the category file; parent `125` missing. Sync must not fail the whole job.
- **`newest` sort** has no feed timestamp. Confirm rule: `first_seen_at`, `product_id`, or drop the option.
- **`amount` `****`:** UI stock badges only treat `*` as low. Define `****` as extra-high in stock.
- **HTML descriptions** vs Figma plain text. Rendering HTML needs sanitization; translating HTML is lossy.
- **Documents tab** and **related** are UI-only fiction.
- **Admin inventory CRUD** vs “feed overwrites our columns never”: Figma lets admin change price, SKU, name, stock, delete. **v1 recommendation:** hide + translate + featured only; show feed fields read-only. Confirm with product owner.
- **Products disappearing from feed:** hide vs out-of-stock vs keep showing.
- **Image hosting / hotlink** and 14MB JSON fetch time — sync must stream/decode safely on 64–128MB PHP.
- **Translation cost/quality** on 1581 × (name + 2 descriptions + ~features) × 2 langs. Empty short/full should not call the API.
- **Contact form** and **consultation** CTA have no backend; **request quote** just links to `/contact`.
- **Cart** is memory-only; language switch and multi-tab are inconsistent.
- **Checkout attachment** type/size: reuse form rules (pdf/images/dwg, 20MB) or images-only.
- **Order id format** Figma `SO-1048` vs integer PK — optional display prefix.
- **No order detail** in Figma admin (no line items, no address on click). Table has address in type but column unused. You’ll want a detail view for phone confirmation.
- **Dashboard “revenue”** sums completed order totals — not real payments.
- **Production vs this git:** catalog proxies live on sentra.ge but not in current `web.php`. Don’t assume deploy matches repo.
- **Default DB sqlite locally / MySQL on Proservice** (deploy workflow uses `pdo_mysql`). Write migrations driver-agnostic (avoid MySQL-only enums if sqlite is used in dev — existing forms enum already special-cased).
- **Figma Make MCP** has no design-file frames; source-of-truth is the generated React, not pixels in Dev Mode.
- **i18n uppercase** in current app will fight Figma’s sentence case.
- **Spatie `guard_name` web** vs `auth:sanctum` — already works; don’t switch guards casually.
- **Shared hosting cron** user/path/PHP version must match deploy (`php8.3 artisan`). `composer.json` `dev` script starts `queue:listen` — disable that mental model in prod.

---

## Figma inventory (for implementers)

| Path | Role |
|---|---|
| `src/api.ts` | All types + mock API (list in C) |
| `src/app/routes.tsx` | Routes |
| `src/store.tsx` | Cart |
| `src/i18n.tsx` | ka/en/ru UI |
| `src/components/layout.tsx` | Header/footer/drawer |
| `src/components/ui.tsx` | Cards, price, stock |
| `src/pages/Home.tsx` | Landing |
| `src/pages/Catalog.tsx` | Listing |
| `src/pages/ProductDetail.tsx` | PDP |
| `src/pages/Commerce.tsx` | Cart, login, checkout |
| `src/pages/Content.tsx` | About, contact, account, 404 |
| `src/pages/Admin.tsx` | Dashboard, products, orders, settings |

Existing stack to keep: Laravel 12, Sanctum, Spatie roles, ichtrojan OTP, ubill SMS, React 18, Vite, Tailwind 4, react-router (upgrade 7 alignment optional).

---

## K. Decisions

- Nav/home categories: real feed roots. Featured on home, in order, via our own `nav_order` column: 32, 77, 66, 61, 155, 103, 85, 70. Roots 152 and 180 (fire panels) are not featured but remain browsable.
- "newest" sort = `products.first_seen_at` (set once, on first sync, never updated).
- Featured products: `is_featured` flag (ours). Until any are set, home shows the latest in-stock products.
- Products missing from the feed: `in_feed=false`, hidden from storefront, never deleted (order history needs them).
- `stock_level` `"****"` means high stock (treat like `"***"` in UI).
- Images: keep remote URLs for v1.
- Descriptions: store raw HTML from the feed; sanitize on OUTPUT.
- Admin product editing in v1: `is_hidden`, `is_featured`, translations only. Feed fields are read-only.
- Translation: NOT in this release. Ship Georgian only; EN/RU come in phase 5. API accepts `?language=ka|en|ru` now, falls back to ka when a translation is empty.
- Documents tab: removed until real data exists.
- Cart: client-side; server recomputes prices at checkout.
