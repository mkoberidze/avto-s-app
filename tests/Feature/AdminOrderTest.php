<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Fixtures\CatalogFeed;
use Tests\TestCase;

class AdminOrderTest extends TestCase
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

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
    }

    public function test_guest_gets_401_on_admin_order_endpoints(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->getJson('/api/admin/orders/1')->assertUnauthorized();
        $this->patchJson('/api/admin/orders/1', ['status' => 'new'])->assertUnauthorized();
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_user_gets_403_on_admin_order_endpoints(): void
    {
        Sanctum::actingAs($this->user());
        $this->getJson('/api/admin/orders')->assertForbidden();
        $this->getJson('/api/admin/orders/1')->assertForbidden();
        $this->patchJson('/api/admin/orders/1', ['status' => 'new'])->assertForbidden();
        $this->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_admin_gets_200_on_admin_order_endpoints(): void
    {
        $this->syncFeed();
        $order = $this->makeOrder($this->user(), ['status' => 'new', 'total' => 100]);
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/orders')->assertOk()
            ->assertJsonStructure(['orders', 'total', 'page', 'per_page', 'counts']);
        $this->getJson('/api/admin/orders/'.$order->id)->assertOk()
            ->assertJsonPath('id', $order->id);
        $this->patchJson('/api/admin/orders/'.$order->id, ['status' => 'under_review'])->assertOk()
            ->assertJsonPath('status', 'under_review');
        $this->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonStructure(['orders_total', 'orders_by_status', 'completed_revenue', 'orders_last_30_days', 'recent_orders', 'products', 'last_sync_at']);
    }

    public function test_filters_counts_and_search(): void
    {
        $this->syncFeed();
        $user = $this->user();
        $this->makeOrder($user, [
            'status' => 'new',
            'customer_name' => 'Nika Beridze',
            'phone' => '+995555100001',
            'total' => 10,
            'created_at' => '2026-01-10 12:00:00',
            'updated_at' => '2026-01-10 12:00:00',
        ]);
        $review = $this->makeOrder($user, [
            'status' => 'under_review',
            'customer_name' => 'Giorgi',
            'phone' => '+995555200002',
            'total' => 20,
            'created_at' => '2026-02-15 12:00:00',
            'updated_at' => '2026-02-15 12:00:00',
        ]);
        $this->makeOrder($user, [
            'status' => 'completed',
            'customer_name' => 'Ana',
            'phone' => '+995555300003',
            'total' => 30,
            'created_at' => '2026-03-20 12:00:00',
            'updated_at' => '2026-03-20 12:00:00',
        ]);

        Sanctum::actingAs($this->admin());

        $all = $this->getJson('/api/admin/orders')->assertOk();
        $this->assertSame(3, $all->json('total'));
        $this->assertSame(1, $all->json('counts.new'));
        $this->assertSame(1, $all->json('counts.under_review'));
        $this->assertSame(0, $all->json('counts.in_progress'));
        $this->assertSame(1, $all->json('counts.completed'));
        $this->assertEquals(10, $all->json('orders.2.total'));
        $this->assertTrue(is_int($all->json('orders.2.total')) || is_float($all->json('orders.2.total')));

        $byStatus = $this->getJson('/api/admin/orders?status=new')->assertOk();
        $this->assertSame(1, $byStatus->json('total'));
        $this->assertSame(1, $byStatus->json('counts.new'));
        $this->assertSame(1, $byStatus->json('counts.completed'));

        $byName = $this->getJson('/api/admin/orders?q=Nika')->assertOk();
        $this->assertSame(1, $byName->json('total'));
        $this->assertSame('Nika Beridze', $byName->json('orders.0.customer_name'));

        $byPhone = $this->getJson('/api/admin/orders?q=555200002')->assertOk();
        $this->assertSame(1, $byPhone->json('total'));

        $byNumber = $this->getJson('/api/admin/orders?q='.$review->number)->assertOk();
        $this->assertSame(1, $byNumber->json('total'));
        $this->assertSame($review->id, $byNumber->json('orders.0.id'));

        $byId = $this->getJson('/api/admin/orders?q='.$review->id)->assertOk();
        $this->assertSame(1, $byId->json('total'));

        $dates = $this->getJson('/api/admin/orders?date_from=2026-02-01&date_to=2026-02-28')->assertOk();
        $this->assertSame(1, $dates->json('total'));
        $this->assertSame('Giorgi', $dates->json('orders.0.customer_name'));
        $this->assertSame(0, $dates->json('counts.new'));
        $this->assertSame(1, $dates->json('counts.under_review'));
    }

    public function test_patch_validation_and_note(): void
    {
        $this->syncFeed();
        $order = $this->makeOrder($this->user(), ['status' => 'new', 'total' => 50]);
        Sanctum::actingAs($this->admin());

        $this->patchJson('/api/admin/orders/'.$order->id, ['status' => 'nope'])->assertStatus(422);
        $this->patchJson('/api/admin/orders/'.$order->id, [])->assertStatus(422);

        $this->patchJson('/api/admin/orders/'.$order->id, ['admin_note' => 'Call tomorrow'])
            ->assertOk()
            ->assertJsonPath('admin_note', 'Call tomorrow')
            ->assertJsonPath('status', 'new');

        $this->patchJson('/api/admin/orders/'.$order->id, ['admin_note' => '  '])
            ->assertOk()
            ->assertJsonPath('admin_note', null);

        $this->patchJson('/api/admin/orders/'.$order->id, ['status' => 'completed', 'admin_note' => 'Done'])
            ->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('admin_note', 'Done');
    }

    public function test_customer_order_show_does_not_expose_admin_note(): void
    {
        $this->syncFeed();
        $user = $this->user();
        $order = $this->makeOrder($user, ['status' => 'new', 'total' => 80, 'admin_note' => 'internal']);
        Sanctum::actingAs($user);

        $res = $this->getJson('/api/orders/'.$order->id)->assertOk();
        $this->assertArrayNotHasKey('admin_note', $res->json());
        $this->assertEquals(80, $res->json('total'));
        $this->assertTrue(is_int($res->json('total')) || is_float($res->json('total')));
    }

    public function test_dashboard_numbers_and_zero_filled_days(): void
    {
        $this->syncFeed();
        Product::query()->whereKey(101)->update(['is_hidden' => true]);
        Product::query()->whereKey(102)->update(['in_feed' => false]);

        $user = $this->user();
        $this->makeOrder($user, ['status' => 'new', 'total' => 10, 'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2)]);
        $this->makeOrder($user, ['status' => 'in_progress', 'total' => 20, 'created_at' => now(), 'updated_at' => now()]);
        $this->makeOrder($user, ['status' => 'completed', 'total' => 33.5, 'created_at' => now()->subDays(40), 'updated_at' => now()->subDays(40)]);

        Sanctum::actingAs($this->admin());
        $res = $this->getJson('/api/admin/dashboard')->assertOk();

        $this->assertSame(3, $res->json('orders_total'));
        $this->assertSame(1, $res->json('orders_by_status.new'));
        $this->assertSame(0, $res->json('orders_by_status.under_review'));
        $this->assertSame(1, $res->json('orders_by_status.in_progress'));
        $this->assertSame(1, $res->json('orders_by_status.completed'));
        $this->assertEquals(33.5, $res->json('completed_revenue'));
        $this->assertTrue(is_int($res->json('completed_revenue')) || is_float($res->json('completed_revenue')));

        $days = $res->json('orders_last_30_days');
        $this->assertCount(30, $days);
        $this->assertSame(now()->subDays(29)->toDateString(), $days[0]['date']);
        $this->assertSame(now()->toDateString(), $days[29]['date']);
        $this->assertSame(1, collect($days)->firstWhere('date', now()->toDateString())['count']);
        $this->assertSame(1, collect($days)->firstWhere('date', now()->subDays(2)->toDateString())['count']);
        $this->assertSame(0, collect($days)->firstWhere('date', now()->subDays(5)->toDateString())['count']);
        $this->assertCount(3, $res->json('recent_orders'));

        $visible = Product::query()->where('in_feed', true)->where('is_hidden', false)->count();
        $hidden = Product::query()->where('is_hidden', true)->count();
        $gone = Product::query()->where('in_feed', false)->count();
        $this->assertSame($visible, $res->json('products.visible'));
        $this->assertSame($hidden, $res->json('products.hidden'));
        $this->assertSame($gone, $res->json('products.gone'));
        $this->assertNotNull($res->json('last_sync_at'));
    }

    public function test_catalog_sync_does_not_touch_orders(): void
    {
        $this->syncFeed();
        $order = $this->makeOrder($this->user(), ['status' => 'new', 'total' => 99.12, 'admin_note' => 'keep']);
        $count = Order::query()->count();

        $this->syncFeed();

        $this->assertSame($count, Order::query()->count());
        $fresh = $order->fresh();
        $this->assertSame('99.12', (string) $fresh->total);
        $this->assertSame('keep', $fresh->admin_note);
        $this->assertSame('new', $fresh->status);
    }

    public function test_detail_product_exists_and_line_total(): void
    {
        $this->syncFeed();
        $order = $this->makeOrder($this->user(), ['status' => 'new', 'total' => 200]);
        $order->items()->create([
            'product_id' => 101,
            'product_code' => 'CAM-101',
            'name_snapshot' => 'IP camera A',
            'price_snapshot' => 100,
            'quantity' => 2,
        ]);
        $order->items()->create([
            'product_id' => 999999,
            'product_code' => 'GONE',
            'name_snapshot' => 'Deleted',
            'price_snapshot' => 1,
            'quantity' => 1,
        ]);

        Sanctum::actingAs($this->admin());
        $res = $this->getJson('/api/admin/orders/'.$order->id)->assertOk();
        $this->assertTrue($res->json('items.0.product_exists'));
        $this->assertEquals(200, $res->json('items.0.line_total'));
        $this->assertFalse($res->json('items.1.product_exists'));
        $this->assertEquals(200, $res->json('total'));
    }

    private function makeOrder(User $user, array $attrs): Order
    {
        return Order::query()->create(array_merge([
            'user_id' => $user->id,
            'status' => 'new',
            'customer_name' => 'Nika',
            'phone' => $user->phone,
            'address' => 'Tbilisi',
            'comment' => null,
            'attachment_url' => null,
            'total' => 0,
            'language' => 'ka',
            'client_token' => null,
        ], $attrs));
    }

    private function syncFeed(): void
    {
        Http::fake([
            CatalogFeed::categoriesUrl() => Http::response(CatalogFeed::categories()),
            CatalogFeed::productsUrl() => Http::response(CatalogFeed::products()),
        ]);
        $this->artisan('catalog:sync')->assertSuccessful();
    }

    private function admin(): User
    {
        $user = User::factory()->create(['phone' => '+995555900001']);
        $user->assignRole('admin');

        return $user;
    }

    private function user(): User
    {
        $user = User::factory()->create(['phone' => '+995555900002']);
        $user->assignRole('user');

        return $user;
    }
}
