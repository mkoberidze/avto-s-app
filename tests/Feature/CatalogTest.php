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
            'translations' => ['en' => ['name' => 'Keep me']],
            'is_hidden' => true,
            'is_featured' => true,
        ]);
        Category::query()->whereKey(32)->update(['nav_order' => 99]);

        $this->artisan('catalog:sync')->assertSuccessful();

        $product = Product::query()->find(101);
        $this->assertSame(['en' => ['name' => 'Keep me']], $product->translations);
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

        $priceAsc = collect($this->getJson('/api/products?sort=priceAsc&per_page=60')->json('products'))->pluck('price')->all();
        $sorted = $priceAsc;
        sort($sorted);
        $this->assertSame($sorted, $priceAsc);

        $priceDesc = collect($this->getJson('/api/products?sort=priceDesc&per_page=60')->json('products'))->pluck('price')->all();
        $this->assertEquals(1000, $priceDesc[0]);

        $names = collect($this->getJson('/api/products?sort=name&per_page=60')->json('products'))->pluck('name')->all();
        $sortedNames = $names;
        sort($sortedNames, SORT_STRING);
        $this->assertSame($sortedNames, $names);

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
        $this->assertTrue($categoryIds->contains('32'));
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
        $this->assertIsBool($list['in_stock']);
        $this->assertSame('****', $this->getJson('/api/products/106')->json('stock_level'));
        $this->assertSame([], $this->getJson('/api/products/105')->json('features'));
        $this->assertSame('', $this->getJson('/api/products/104')->json('description'));
        $this->assertCount(1, $this->getJson('/api/products?q=CAM-101')->json('products.0.images'));
        $this->assertCount(2, $this->getJson('/api/products/101')->json('images'));
    }

    private function fakeFeed(): void
    {
        Http::fake([
            CatalogFeed::categoriesUrl() => Http::response(CatalogFeed::categories()),
            CatalogFeed::productsUrl() => Http::response(CatalogFeed::products()),
        ]);
    }
}
