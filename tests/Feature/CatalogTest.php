<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\CatalogFeed;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        putenv('DB_CONNECTION=sqlite');
        putenv('DB_DATABASE=:memory:');
        $_ENV['DB_CONNECTION'] = 'sqlite';
        $_ENV['DB_DATABASE'] = ':memory:';
        $_SERVER['DB_CONNECTION'] = 'sqlite';
        $_SERVER['DB_DATABASE'] = ':memory:';

        parent::setUp();

        config([
            'catalog.products_url' => CatalogFeed::productsUrl(),
            'catalog.categories_url' => CatalogFeed::categoriesUrl(),
        ]);
    }

    public function test_sync_is_idempotent_and_keeps_first_seen_at(): void
    {
        $this->fakeFeed();

        $this->artisan('catalog:sync')->assertSuccessful();
        $first = Product::query()->orderBy('id')->get()->map->getAttributes()->all();
        $seen = Product::query()->find(101)->first_seen_at->toJSON();

        $this->artisan('catalog:sync')->assertSuccessful();
        $second = Product::query()->orderBy('id')->get()->map->getAttributes()->all();

        $this->assertSame(12, Product::query()->count());
        $this->assertSame($seen, Product::query()->find(101)->first_seen_at->toJSON());

        $ignore = ['synced_at', 'updated_at'];
        foreach ($first as $i => $row) {
            foreach ($ignore as $key) {
                unset($row[$key], $second[$i][$key]);
            }
            $this->assertEquals($row, $second[$i]);
        }
    }

    public function test_sync_does_not_touch_our_columns(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        Product::query()->whereKey(101)->update([
            'is_hidden' => true,
            'is_featured' => true,
        ]);
        Category::query()->whereKey(32)->update(['nav_order' => 99]);

        $this->artisan('catalog:sync')->assertSuccessful();

        $product = Product::query()->find(101);
        $this->assertTrue($product->is_hidden);
        $this->assertTrue($product->is_featured);
        $this->assertSame(99, Category::query()->find(32)->nav_order);
    }

    public function test_empty_feed_leaves_database_unchanged_and_fails(): void
    {
        $categories = CatalogFeed::categories();
        Http::fake(function ($request) use (&$categories) {
            if (str_contains($request->url(), 'category.json')) {
                return Http::response($categories);
            }

            return Http::response(CatalogFeed::products());
        });

        $this->artisan('catalog:sync')->assertSuccessful();
        $before = Product::query()->count();

        $categories = [];
        $this->artisan('catalog:sync')->assertFailed();
        $this->assertSame($before, Product::query()->count());
        $this->assertSame(12, Product::query()->where('in_feed', true)->count());
    }

    public function test_missing_product_is_marked_out_of_feed_and_hidden_from_api(): void
    {
        $products = CatalogFeed::products();
        Http::fake(function ($request) use (&$products) {
            if (str_contains($request->url(), 'category.json')) {
                return Http::response(CatalogFeed::categories());
            }

            return Http::response($products);
        });

        $this->artisan('catalog:sync')->assertSuccessful();

        $products = array_values(array_filter(
            CatalogFeed::products(),
            fn (array $item) => $item['product_id'] !== '101'
        ));

        $this->artisan('catalog:sync')->assertSuccessful();

        $gone = Product::query()->find(101);
        $this->assertNotNull($gone);
        $this->assertFalse($gone->in_feed);

        $this->getJson('/api/products/101')->assertNotFound();
        $ids = collect($this->getJson('/api/products?per_page=60')->json('products'))->pluck('id');
        $this->assertFalse($ids->contains('101'));
    }

    public function test_category_filter_includes_descendants(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $ids = collect($this->getJson('/api/products?category_id=32&per_page=60')->json('products'))
            ->pluck('id')
            ->sort()
            ->values()
            ->all();

        $this->assertSame(['101', '102', '103', '109', '112'], $ids);
    }

    public function test_sort_brand_price_search_and_pagination(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $newest = $this->getJson('/api/products?sort=newest&per_page=60')->json('products');
        $this->assertSame('112', $newest[0]['id']);
        $this->assertTrue($newest[0]['in_stock']);
        $this->assertSame('107', collect($newest)->last()['id']);
        $this->assertFalse(collect($newest)->last()['in_stock']);

        $priceAsc = $this->getJson('/api/products?sort=priceAsc&per_page=60')->json('products');
        $this->assertStockThen($priceAsc, fn ($row) => $row['price']);

        $priceDesc = collect($this->getJson('/api/products?sort=priceDesc&per_page=60')->json('products'))->pluck('price')->all();
        $this->assertEquals(1000, $priceDesc[0]);

        $named = $this->getJson('/api/products?sort=name&per_page=60')->json('products');
        $this->assertStockThen($named, fn ($row) => $row['name']);

        $hikvision = $this->getJson('/api/products?brand[]=Hikvision&per_page=60')->json();
        $this->assertSame(4, $hikvision['total']);
        foreach ($hikvision['products'] as $product) {
            $this->assertSame('Hikvision', $product['brand']);
        }

        $range = $this->getJson('/api/products?min_price=80&max_price=160&per_page=60')->json('products');
        foreach ($range as $product) {
            $this->assertTrue($product['price'] >= 80 && $product['price'] <= 160);
        }

        $search = $this->getJson('/api/products?q=FIRE-104&per_page=60')->json('products');
        $this->assertCount(1, $search);
        $this->assertSame('104', $search[0]['id']);

        $page1 = $this->getJson('/api/products?per_page=5&page=1')->json();
        $page2 = $this->getJson('/api/products?per_page=5&page=2')->json();
        $this->assertSame(12, $page1['total']);
        $this->assertSame(5, $page1['per_page']);
        $this->assertCount(5, $page1['products']);
        $this->assertCount(5, $page2['products']);
        $this->assertNotSame($page1['products'][0]['id'], $page2['products'][0]['id']);

        $inStock = $this->getJson('/api/products?in_stock=1&per_page=60')->json();
        $this->assertSame(11, $inStock['total']);
    }

    public function test_hidden_and_out_of_feed_products_never_appear(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        Product::query()->whereKey(102)->update(['is_hidden' => true]);
        Product::query()->whereKey(103)->update(['in_feed' => false]);
        Category::query()->whereKey(155)->update(['is_hidden' => true]);

        $productIds = collect($this->getJson('/api/products?per_page=60')->json('products'))->pluck('id');
        $this->assertFalse($productIds->contains('102'));
        $this->assertFalse($productIds->contains('103'));

        $this->getJson('/api/products/102')->assertNotFound();
        $this->getJson('/api/products/103')->assertNotFound();

        $brandNames = collect($this->getJson('/api/brands')->json())->pluck('name');
        $this->assertFalse($brandNames->contains('Dahua'));

        $categoryIds = collect($this->getJson('/api/categories')->json())->pluck('id');
        $this->assertFalse($categoryIds->contains('155'));
        $this->assertFalse($categoryIds->contains('999'));
        $this->assertTrue($categoryIds->contains('32'));
    }

    public function test_empty_categories_are_omitted_from_public_api(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $ids = collect($this->getJson('/api/categories')->json())->pluck('id');
        $this->assertFalse($ids->contains('999'));
        $this->assertFalse($ids->contains('152'));
        $this->assertTrue($ids->contains('32'));
        $this->assertTrue($ids->contains('77'));
    }

    public function test_category_parent_overrides_nest_stray_roots(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $this->assertSame(77, (int) Category::query()->find(152)->parent_id);
        $this->assertSame(77, (int) Category::query()->find(180)->parent_id);
        $this->assertNull(Category::query()->find(32)->parent_id);
    }

    public function test_sync_from_local_file_path(): void
    {
        $dir = sys_get_temp_dir().'/catalog-feed-'.uniqid();
        mkdir($dir);
        file_put_contents($dir.'/category.json', json_encode(CatalogFeed::categories(), JSON_UNESCAPED_UNICODE));
        file_put_contents($dir.'/products.json', json_encode(CatalogFeed::products(), JSON_UNESCAPED_UNICODE));

        config([
            'catalog.categories_url' => $dir.'/category.json',
            'catalog.products_url' => $dir.'/products.json',
        ]);

        Http::fake();

        $this->artisan('catalog:sync')->assertSuccessful();

        $this->assertSame(11, Category::query()->count());
        $this->assertSame(12, Product::query()->count());
        Http::assertNothingSent();

        array_map('unlink', glob($dir.'/*') ?: []);
        rmdir($dir);
    }

    public function test_category_fallback_applies_only_when_missing_and_is_idempotent(): void
    {
        config(['catalog.category_fallbacks' => [115 => 77, 32 => 999]]);

        $products = CatalogFeed::products();
        $products[] = CatalogFeed::product('113', '115', 'FIRE-113', 'Mapped fire item', 'Unipos', '10.00', '1', '**');

        Http::fake([
            CatalogFeed::categoriesUrl() => Http::response(CatalogFeed::categories()),
            CatalogFeed::productsUrl() => Http::response($products),
        ]);

        $this->artisan('catalog:sync')->assertSuccessful();

        $this->assertSame(77, (int) Product::query()->find(113)->category_id);
        $this->assertSame(32, (int) Product::query()->find(109)->category_id);
        $this->assertSame(555, (int) Product::query()->find(106)->category_id);

        $this->artisan('catalog:sync')->assertSuccessful();
        $this->assertSame(77, (int) Product::query()->find(113)->category_id);
        $this->assertSame(32, (int) Product::query()->find(109)->category_id);
    }

    public function test_featured_filter_returns_only_featured_products(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $this->assertSame(0, $this->getJson('/api/products?featured=1')->json('total'));

        Product::query()->whereKey(101)->update(['is_featured' => true]);
        Product::query()->whereKey(107)->update(['is_featured' => true]);
        Product::query()->whereKey(102)->update(['is_featured' => true, 'is_hidden' => true]);

        $payload = $this->getJson('/api/products?featured=1')->json();
        $this->assertSame(2, $payload['total']);
        $this->assertSame('101', $payload['products'][0]['id']);
        $this->assertTrue($payload['products'][0]['in_stock']);
        $this->assertSame('107', $payload['products'][1]['id']);
        $this->assertFalse($payload['products'][1]['in_stock']);
    }

    public function test_html_in_descriptions_is_sanitized_on_output(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $list = $this->getJson('/api/products/112')->json();
        $this->assertSame('Short safe', $this->getJson('/api/products?q=HTML&per_page=60')->json('products.0.short_description'));
        $this->assertStringNotContainsString('<script', $list['description']);
        $this->assertStringNotContainsString('onerror', $list['description']);
        $this->assertStringNotContainsString('<img', $list['description']);
        $this->assertStringContainsString('<p>Hello</p>', $list['description']);
        $this->assertStringContainsString('<a href="https://example.com">link</a>', $list['description']);
        $this->assertIsString($list['id']);
        $this->assertIsString($list['category_id']);
        $this->assertTrue(is_int($list['price']) || is_float($list['price']));
        $this->assertFalse($list['price_on_request']);
        $this->assertIsBool($list['in_stock']);
        $this->assertSame('****', $this->getJson('/api/products/106')->json('stock_level'));
        $this->assertSame([], $this->getJson('/api/products/105')->json('features'));
        $this->assertSame('', $this->getJson('/api/products/104')->json('description'));
        $this->assertCount(1, $this->getJson('/api/products?q=CAM-101')->json('products.0.images'));
        $this->assertCount(2, $this->getJson('/api/products/101')->json('images'));
    }

    public function test_zero_feed_price_is_price_on_request(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();
        Product::query()->whereKey(101)->update(['price' => 0]);

        $detail = $this->getJson('/api/products/101')->assertOk()->json();
        $this->assertSame(0, $detail['price']);
        $this->assertTrue($detail['price_on_request']);
        $this->assertTrue($detail['in_stock']);

        $list = collect($this->getJson('/api/products?q=CAM-101&per_page=60')->json('products'))->firstWhere('id', '101');
        $this->assertTrue($list['price_on_request']);
    }

    public function test_language_query_is_ignored_and_returns_georgian(): void
    {
        $this->fakeFeed();
        $this->artisan('catalog:sync')->assertSuccessful();

        $plain = $this->getJson('/api/products/101')->assertOk()->json();
        $en = $this->getJson('/api/products/101?language=en')->assertOk()->json();
        $ru = $this->getJson('/api/products/101?language=ru')->assertOk()->json();
        $this->assertSame('IP camera A', $plain['name']);
        $this->assertSame($plain['name'], $en['name']);
        $this->assertSame($plain['name'], $ru['name']);
        $this->assertSame($plain['short_description'], $en['short_description']);

        $cats = $this->getJson('/api/categories')->assertOk()->json();
        $catsEn = $this->getJson('/api/categories?language=en')->assertOk()->json();
        $this->assertSame($cats[0]['name'], $catsEn[0]['name']);
        $this->assertSame('ვიდეო მეთვალყურეობა', collect($cats)->firstWhere('id', '32')['name']);
    }

    private function fakeFeed(): void
    {
        Http::fake([
            CatalogFeed::categoriesUrl() => Http::response(CatalogFeed::categories()),
            CatalogFeed::productsUrl() => Http::response(CatalogFeed::products()),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $products
     */
    private function assertStockThen(array $products, callable $key): void
    {
        $inStock = [];
        $outOfStock = [];
        $seenOutOfStock = false;

        foreach ($products as $product) {
            if ($product['in_stock']) {
                $this->assertFalse($seenOutOfStock, 'Out-of-stock products must come after in-stock products');
                $inStock[] = $key($product);
            } else {
                $seenOutOfStock = true;
                $outOfStock[] = $key($product);
            }
        }

        $sortedInStock = $inStock;
        $sortedOutOfStock = $outOfStock;
        $flags = is_numeric($inStock[0] ?? $outOfStock[0] ?? null) ? SORT_NUMERIC : SORT_STRING;
        sort($sortedInStock, $flags);
        sort($sortedOutOfStock, $flags);

        $this->assertSame($sortedInStock, $inStock);
        $this->assertSame($sortedOutOfStock, $outOfStock);
    }
}
