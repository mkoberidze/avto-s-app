<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Fixtures\CatalogFeed;
use Tests\TestCase;

class OrderTest extends TestCase
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
            'services.ubill.api_key' => 'test-key',
            'services.ubill.brand_id' => '1',
        ]);

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        Storage::fake('public');
    }

    public function test_guest_gets_401_on_orders(): void
    {
        $this->post('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [['product_id' => 101, 'quantity' => 1]],
        ], ['Accept' => 'application/json'])->assertUnauthorized();

        $this->getJson('/api/orders')->assertUnauthorized();
    }

    public function test_total_is_computed_server_side_and_client_price_is_ignored(): void
    {
        $this->syncFeed();
        Sanctum::actingAs($this->user());

        $res = $this->postJson('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [
                ['product_id' => 101, 'quantity' => 2, 'price' => 1, 'name' => 'hack'],
            ],
        ])->assertCreated();

        $this->assertEquals(200, $res->json('total'));
        $this->assertTrue(is_int($res->json('total')) || is_float($res->json('total')));
        $this->assertSame('SO-00001', $res->json('number'));
        $item = Order::query()->first()->items()->first();
        $this->assertSame('100.00', (string) $item->price_snapshot);
        $this->assertSame('IP camera A', $item->name_snapshot);
    }

    public function test_unavailable_products_rejected_and_nothing_saved(): void
    {
        $this->syncFeed();
        Product::query()->whereKey(101)->update(['is_hidden' => true]);
        Product::query()->whereKey(102)->update(['in_feed' => false]);

        Sanctum::actingAs($this->user());

        $res = $this->postJson('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [
                ['product_id' => 101, 'quantity' => 1],
                ['product_id' => 102, 'quantity' => 1],
                ['product_id' => 107, 'quantity' => 1],
                ['product_id' => 999999, 'quantity' => 1],
            ],
        ])->assertStatus(422);

        $this->assertSame('items_unavailable', $res->json('message'));
        $byId = collect($res->json('items'))->keyBy('product_id');
        $this->assertSame('not_found', $byId['101']['reason']);
        $this->assertSame('not_found', $byId['102']['reason']);
        $this->assertSame('out_of_stock', $byId['107']['reason']);
        $this->assertSame('not_found', $byId['999999']['reason']);
        $this->assertSame(0, Order::query()->count());
    }

    public function test_duplicate_lines_are_merged(): void
    {
        $this->syncFeed();
        Sanctum::actingAs($this->user());

        $res = $this->postJson('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [
                ['product_id' => 101, 'quantity' => 2],
                ['product_id' => 101, 'quantity' => 3],
            ],
        ])->assertCreated();

        $this->assertSame(1, $res->json('item_count'));
        $this->assertEquals(500, $res->json('total'));
        $this->assertSame(5, Order::query()->first()->items()->first()->quantity);
    }

    public function test_phone_comes_from_account_not_request(): void
    {
        $this->syncFeed();
        $user = $this->user();
        $user->forceFill(['name' => null])->save();
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', [
            'customer_name' => 'Nika Beridze',
            'phone' => '+995000000000',
            'address' => 'Tbilisi 1',
            'items' => [['product_id' => 101, 'quantity' => 1]],
        ])->assertCreated();

        $order = Order::query()->first();
        $this->assertSame($user->phone, $order->phone);
        $this->assertNotSame('+995000000000', $order->phone);
        $this->assertSame('Nika Beridze', $user->fresh()->name);
    }

    public function test_client_token_is_idempotent(): void
    {
        $this->syncFeed();
        Sanctum::actingAs($this->user());
        $payload = [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'client_token' => str_repeat('a', 32),
            'items' => [['product_id' => 101, 'quantity' => 1]],
        ];

        $first = $this->postJson('/api/orders', $payload)->assertCreated();
        $second = $this->postJson('/api/orders', array_merge($payload, [
            'items' => [['product_id' => 103, 'quantity' => 1]],
        ]))->assertOk();

        $this->assertSame($first->json('id'), $second->json('id'));
        $this->assertSame(1, Order::query()->count());
        $this->assertEquals(100, $second->json('total'));
    }

    public function test_another_users_order_is_404(): void
    {
        $this->syncFeed();
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [['product_id' => 101, 'quantity' => 1]],
        ])->assertCreated()->json('id');

        $other = User::factory()->create(['phone' => '+995555000009']);
        $other->assignRole('user');
        Sanctum::actingAs($other);

        $this->getJson('/api/orders/'.$id)->assertNotFound();
        $this->getJson('/api/orders')->assertOk()->assertJson(['orders' => []]);
    }

    public function test_attachment_validation(): void
    {
        $this->syncFeed();
        Sanctum::actingAs($this->user());

        $this->post('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [['product_id' => 101, 'quantity' => 1]],
            'attachment' => UploadedFile::fake()->create('notes.txt', 20, 'text/plain'),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->post('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [['product_id' => 101, 'quantity' => 1]],
            'attachment' => UploadedFile::fake()->create('huge.pdf', 20481, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $ok = $this->post('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'comment' => 'please call',
            'language' => 'ka',
            'items' => [['product_id' => 101, 'quantity' => 1]],
            'attachment' => UploadedFile::fake()->create('plan.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $detail = $this->getJson('/api/orders/'.$ok->json('id'))->assertOk();
        $this->assertNotEmpty($detail->json('attachment_url'));
        $this->assertSame('Tbilisi', $detail->json('address'));
        $this->assertSame('please call', $detail->json('comment'));
    }

    public function test_sms_failure_still_creates_order(): void
    {
        $this->syncFeed();
        $admin = User::factory()->create(['phone' => '+995555000001']);
        $admin->assignRole('admin');

        Http::fake([
            'https://api.ubill.dev/*' => Http::response('fail', 500),
        ]);

        Sanctum::actingAs($this->user());
        $this->postJson('/api/orders', [
            'customer_name' => 'Nika',
            'address' => 'Tbilisi',
            'items' => [['product_id' => 101, 'quantity' => 1]],
        ])->assertCreated();

        $this->assertSame(1, Order::query()->count());
    }

    private function syncFeed(): void
    {
        Http::fake([
            CatalogFeed::categoriesUrl() => Http::response(CatalogFeed::categories()),
            CatalogFeed::productsUrl() => Http::response(CatalogFeed::products()),
            'https://api.ubill.dev/*' => Http::response('ok', 200),
        ]);
        $this->artisan('catalog:sync')->assertSuccessful();
    }

    private function user(): User
    {
        $user = User::factory()->create(['phone' => '+995555000002']);
        $user->assignRole('user');

        return $user;
    }
}
