<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Ichtrojan\Otp\Otp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Fixtures\CatalogFeed;
use Tests\TestCase;

class AdminCatalogTest extends TestCase
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

    public function test_guest_gets_401_on_admin_products(): void
    {
        $this->getJson('/api/admin/products')->assertUnauthorized();
    }

    public function test_user_gets_403_on_admin_products(): void
    {
        Sanctum::actingAs($this->user());
        $this->getJson('/api/admin/products')->assertForbidden();
    }

    public function test_admin_gets_200_on_admin_products(): void
    {
        $this->syncFeed();
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/admin/products')->assertOk()->assertJsonStructure(['products', 'total', 'page', 'per_page']);
    }

    public function test_admin_otp_login_returns_admin_role_only(): void
    {
        $admin = $this->admin();
        $otp = (new Otp())->generate($admin->phone, 'numeric', 6, 10);

        $this->postJson('/api/auth/otp/verify', [
            'phone' => $admin->phone,
            'otp' => $otp->token,
        ])->assertOk()->assertJsonPath('user.role', 'admin');

        $fresh = $admin->fresh();
        $this->assertTrue($fresh->hasRole('admin'));
        $this->assertFalse($fresh->hasRole('user'));
        $this->assertSame(['admin'], $fresh->getRoleNames()->all());

        Sanctum::actingAs($fresh);
        $this->getJson('/api/user')->assertOk()->assertJsonPath('user.role', 'admin');
    }

    public function test_regular_otp_login_still_assigns_user(): void
    {
        $user = User::factory()->create(['phone' => '+995555000099']);
        $otp = (new Otp())->generate($user->phone, 'numeric', 6, 10);

        $this->postJson('/api/auth/otp/verify', [
            'phone' => $user->phone,
            'otp' => $otp->token,
        ])->assertOk()->assertJsonPath('user.role', 'user');

        $this->assertTrue($user->fresh()->hasRole('user'));
        $this->assertFalse($user->fresh()->hasRole('admin'));
    }

    public function test_admin_products_list_filters_and_includes_hidden(): void
    {
        $this->syncFeed();
        Product::query()->whereKey(101)->update([
            'is_hidden' => true,
            'is_featured' => true,
            'translations' => ['en' => ['name' => 'Hidden EN cam']],
        ]);
        Product::query()->whereKey(102)->update(['in_feed' => false]);

        Sanctum::actingAs($this->admin());

        $all = $this->getJson('/api/admin/products?per_page=100')->assertOk()->json();
        $this->assertSame(12, $all['total']);
        $hidden = collect($all['products'])->firstWhere('id', '101');
        $this->assertTrue($hidden['is_hidden']);
        $this->assertTrue($hidden['has_en']);
        $this->assertFalse($hidden['has_ru']);

        $this->assertSame(1, $this->getJson('/api/admin/products?status=hidden')->json('total'));
        $this->assertSame(1, $this->getJson('/api/admin/products?status=gone')->json('total'));
        $this->assertSame(1, $this->getJson('/api/admin/products?featured=1')->json('total'));
        $this->assertSame(1, $this->getJson('/api/admin/products?q=Hidden%20EN')->json('total'));
        $this->assertGreaterThanOrEqual(1, $this->getJson('/api/admin/products?category_id=32')->json('total'));
        $this->assertSame(4, $this->getJson('/api/admin/products?brand=Hikvision')->json('total'));
    }

    public function test_admin_product_update_allows_only_owned_fields_and_merges_translations(): void
    {
        $this->syncFeed();
        Product::query()->whereKey(101)->update([
            'translations' => [
                'en' => ['name' => 'Keep EN', 'description' => 'Keep desc'],
                'ru' => ['name' => 'Keep RU'],
            ],
        ]);

        Sanctum::actingAs($this->admin());

        $this->putJson('/api/admin/products/101', ['price' => 1])->assertStatus(422);

        $updated = $this->putJson('/api/admin/products/101', [
            'is_hidden' => true,
            'is_featured' => true,
            'translations' => [
                'en' => ['name' => 'New EN'],
                'ru' => ['short_description' => 'RU short'],
            ],
        ])->assertOk()->json();

        $this->assertTrue($updated['is_hidden']);
        $this->assertTrue($updated['is_featured']);
        $this->assertSame('New EN', $updated['translations']['en']['name']);
        $this->assertSame('Keep desc', $updated['translations']['en']['description']);
        $this->assertSame('Keep RU', $updated['translations']['ru']['name']);
        $this->assertSame('RU short', $updated['translations']['ru']['short_description']);
        $this->assertSame('IP camera A', $updated['name_ka']);
        $this->assertEquals(100, $updated['price']);

        $this->artisan('catalog:sync')->assertSuccessful();
        $product = Product::query()->find(101);
        $this->assertTrue($product->is_hidden);
        $this->assertTrue($product->is_featured);
        $this->assertSame('New EN', $product->translations['en']['name']);
        $this->assertSame('Keep desc', $product->translations['en']['description']);
    }

    public function test_admin_product_detail_includes_hidden_and_out_of_feed(): void
    {
        $this->syncFeed();
        Product::query()->whereKey(102)->update(['is_hidden' => true, 'in_feed' => false]);
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/admin/products/102')->assertOk()
            ->assertJsonPath('id', '102')
            ->assertJsonPath('is_hidden', true)
            ->assertJsonPath('in_feed', false);
    }

    public function test_admin_categories_and_update_rules(): void
    {
        $this->syncFeed();
        Product::query()->whereKey(101)->update(['is_hidden' => true]);
        Sanctum::actingAs($this->admin());

        $list = $this->getJson('/api/admin/categories')->assertOk()->json();
        $cctv = collect($list)->firstWhere('id', '32');
        $this->assertSame('ვიდეო მეთვალყურეობა', $cctv['name_ka']);
        $this->assertGreaterThanOrEqual(4, $cctv['product_count']);

        $this->putJson('/api/admin/categories/32', ['name_ka' => 'Nope'])->assertStatus(422);

        $updated = $this->putJson('/api/admin/categories/32', [
            'is_hidden' => true,
            'nav_order' => 1,
            'translations' => ['en' => ['name' => 'CCTV']],
        ])->assertOk()->json();

        $this->assertTrue($updated['is_hidden']);
        $this->assertSame(1, $updated['nav_order']);
        $this->assertSame('CCTV', $updated['translations']['en']['name']);

        $this->putJson('/api/admin/categories/32', ['nav_order' => null])->assertOk()->assertJsonPath('nav_order', null);
    }

    public function test_settings_accept_contact_keys_and_normalize_carousel(): void
    {
        Sanctum::actingAs($this->admin());
        Setting::set('carousel_images', json_encode(['https://example.com/a.jpg']));

        $get = $this->getJson('/api/settings')->assertOk()->json();
        $this->assertIsArray($get['carousel_images']);
        $this->assertSame('', $get['store_name']);
        $this->assertSame(['https://example.com/a.jpg'], $get['carousel_images']);

        $this->postJson('/api/admin/settings', ['unknown_key' => 'x'])->assertStatus(422);

        $saved = $this->postJson('/api/admin/settings', [
            'store_name' => 'Sentra',
            'contact_email' => 'shop@sentra.ge',
            'phone' => '+995 32 2 11 22 33',
            'address' => 'Tbilisi',
            'delivery_note' => 'Call first',
        ])->assertOk()->json();

        $this->assertSame('Sentra', $saved['store_name']);
        $this->assertSame('shop@sentra.ge', $saved['contact_email']);
        $this->assertSame('Tbilisi', $saved['address']);
        $this->assertIsArray($saved['carousel_images']);

        $public = $this->getJson('/api/settings')->json();
        $this->assertSame('Sentra', $public['store_name']);
        $this->assertSame('+995 32 2 11 22 33', $public['phone']);
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
        $user = User::factory()->create(['phone' => '+995555000001']);
        $user->assignRole('admin');

        return $user;
    }

    private function user(): User
    {
        $user = User::factory()->create(['phone' => '+995555000002']);
        $user->assignRole('user');

        return $user;
    }
}
