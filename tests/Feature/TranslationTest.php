<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\TranslationCache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TranslationTest extends TestCase
{
    use RefreshDatabase;

    private string $secret = 'test-groq-secret-never-log';

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
            'translation.enabled' => true,
            'translation.api_key' => $this->secret,
            'translation.request_interval_ms' => 0,
            'translation.daily_token_budget' => 0,
            'translation.batch_max_items' => 20,
            'translation.batch_max_chars' => 6000,
        ]);
    }

    public function test_second_run_makes_zero_api_calls(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name', '--limit' => 10])->assertSuccessful();
        $this->assertNotNull(Product::query()->find(1)->name_en);
        $this->assertSame(1, Http::recorded()->count());

        Http::fake(fn () => $this->fail('API must not be called on the second run'));
        $before = Product::query()->find(1)->translations;
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name', '--limit' => 10])->assertSuccessful();
        $this->assertSame($before, Product::query()->find(1)->translations);
    }

    public function test_changed_source_retranslates_only_that_field(): void
    {
        $product = $this->product(1, [
            'name_ka' => 'სახანძრო პანელი',
            'short_description_ka' => 'მოკლე აღწერა',
        ]);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name,short_description', '--limit' => 10])->assertSuccessful();
        $product->refresh();
        $nameHash = data_get($product->translations, 'en._h.name');
        $shortHash = data_get($product->translations, 'en._h.short_description');
        $shortValue = $product->translations['en']['short_description'];

        $product->name_ka = 'ვიდეო მეთვალყურეობა';
        $product->save();

        Http::fake(function (Request $request) {
            return $this->completion($this->echoItems($request, 'EN '));
        });
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name,short_description', '--limit' => 10])->assertSuccessful();
        $this->assertSame(1, Http::recorded()->count());
        $payload = json_decode(Http::recorded()[0][0]->data()['messages'][1]['content'], true);
        $this->assertCount(1, $payload['items']);
        $this->assertSame('name', explode(':', $payload['items'][0]['id'])[1]);
        $fresh = $product->fresh();
        $this->assertSame($shortValue, $fresh->translations['en']['short_description']);
        $this->assertSame($shortHash, data_get($fresh->translations, 'en._h.short_description'));
        $this->assertNotSame($nameHash, data_get($fresh->translations, 'en._h.name'));
    }

    public function test_manual_fields_survive_force(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი', 'short_description_ka' => 'მოკლე აღწერა']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/products/1', [
            'translations' => ['en' => ['name' => 'Hand edited panel']],
        ])->assertOk();
        $this->assertContains('name', Product::query()->find(1)->translations['en']['_manual']);
        $this->assertSame('Hand edited panel', Product::query()->find(1)->name_en);

        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--force' => true, '--limit' => 10])->assertSuccessful();
        $this->assertSame('Hand edited panel', Product::query()->find(1)->translations['en']['name']);
        $this->assertSame('Hand edited panel', Product::query()->find(1)->name_en);
        $this->assertNotEmpty(Product::query()->find(1)->translations['en']['short_description']);
    }

    public function test_priority_translates_names_before_descriptions(): void
    {
        $this->product(1, ['name_ka' => 'პანელი ერთი', 'short_description_ka' => 'აღწერა ერთი', 'first_seen_at' => now()->subDay()]);
        $this->product(2, ['name_ka' => 'პანელი ორი', 'short_description_ka' => 'აღწერა ორი', 'first_seen_at' => now()]);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--limit' => 2])->assertSuccessful();
        $this->assertNotNull(Product::query()->find(1)->name_en);
        $this->assertNotNull(Product::query()->find(2)->name_en);
        $this->assertArrayNotHasKey('short_description', Product::query()->find(1)->translations['en'] ?? []);
        $this->assertArrayNotHasKey('short_description', Product::query()->find(2)->translations['en'] ?? []);
    }

    public function test_feature_strings_are_cached_across_products(): void
    {
        $features = ['რეზოლუცია' => 'ოთხი მეგაპიქსელი'];
        $this->product(1, ['name_ka' => 'კამერა ერთი', 'features' => $features]);
        $this->product(2, ['name_ka' => 'კამერა ორი', 'features' => $features]);
        $this->product(3, ['name_ka' => 'კამერა სამი', 'features' => $features]);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'features', '--limit' => 10])->assertSuccessful();
        $sent = [];
        foreach (Http::recorded() as $pair) {
            $payload = json_decode($pair[0]->data()['messages'][1]['content'], true);
            foreach ($payload['items'] as $item) {
                $sent[] = $item['text'];
            }
        }
        $this->assertEqualsCanonicalizing(['რეზოლუცია', 'ოთხი მეგაპიქსელი'], $sent);
        $this->assertCount(2, $sent);
        $this->assertSame(2, TranslationCache::query()->count());
        $this->assertNotEmpty(Product::query()->find(3)->translations['en']['features']);
    }

    public function test_non_georgian_and_numeric_strings_are_not_sent(): void
    {
        $this->product(1, ['name_ka' => 'CAM-101']);
        $this->product(2, ['name_ka' => '42']);
        $this->product(3, [
            'name_ka' => 'პანელი',
            'features' => ['Voltage' => '12', 'Code' => 'ABC'],
        ]);
        Http::fake(function (Request $request) {
            return $this->completion($this->echoItems($request, 'EN '));
        });
        $this->artisan('catalog:translate', ['--lang' => 'en', '--limit' => 20])->assertSuccessful();
        foreach (Http::recorded() as $pair) {
            $payload = json_decode($pair[0]->data()['messages'][1]['content'], true);
            foreach ($payload['items'] as $item) {
                $this->assertDoesNotMatchRegularExpression('/^(CAM-101|42|Voltage|12|ABC)$/', $item['text']);
            }
        }
        $this->assertSame('CAM-101', Product::query()->find(1)->name_en);
        $this->assertSame('42', Product::query()->find(2)->name_en);
    }

    public function test_validation_rejects_missing_model_number_and_html_mismatch(): void
    {
        $this->product(1, ['name_ka' => 'პანელი DS-2CD2043 4MP']);
        $this->product(2, ['name_ka' => 'დეტექტორი', 'description_ka' => '<p>ეს არის <b>ტექსტი</b></p>']);
        Http::fake(function (Request $request) {
            $payload = json_decode($request->data()['messages'][1]['content'], true);
            $items = [];
            foreach ($payload['items'] as $item) {
                $text = str_contains($item['text'], 'DS-2CD2043')
                    ? 'Panel without code'
                    : '<div>translated</div>';
                $items[] = ['id' => $item['id'], 'text' => $text];
            }

            return $this->completion($items);
        });
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name,description', '--limit' => 10])->assertSuccessful();
        $this->assertNull(Product::query()->find(1)->name_en);
        $this->assertArrayNotHasKey('description', Product::query()->find(2)->translations['en'] ?? []);
        $this->assertSame(0, TranslationCache::query()->count());
    }

    public function test_missing_id_invalid_json_and_5xx_do_not_crash(): void
    {
        config(['translation.batch_max_items' => 1]);
        $this->product(1, [
            'name_ka' => 'სახანძრო პანელი',
            'translations' => ['en' => ['name' => 'Keep', '_h' => ['name' => 'stale']]],
            'name_en' => 'Keep',
            'first_seen_at' => now()->subDays(2),
        ]);
        $this->product(2, ['name_ka' => 'ვიდეო კამერა', 'first_seen_at' => now()->subDay()]);
        $this->product(3, ['name_ka' => 'დეტექტორი', 'first_seen_at' => now()]);
        Http::fake([
            'https://api.groq.com/openai/v1/chat/completions' => Http::sequence()
                ->push(['choices' => [['message' => ['content' => json_encode(['items' => []], JSON_THROW_ON_ERROR)]]]], 200)
                ->push('not-json', 200)
                ->push('not-json', 200)
                ->push('error', 500)
                ->push('error', 500),
        ]);
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name', '--force' => true, '--limit' => 3])->assertSuccessful();
        $this->assertSame('Keep', Product::query()->find(1)->name_en);
        $this->assertNull(Product::query()->find(2)->name_en);
        $this->assertNull(Product::query()->find(3)->name_en);
    }

    public function test_400_on_json_object_retries_without_response_format(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        $sawRetry = false;
        Http::fake(function (Request $request) use (&$sawRetry) {
            $body = $request->data();
            if (isset($body['response_format'])) {
                return Http::response(['error' => ['message' => 'json_object unsupported']], 400);
            }
            $sawRetry = true;

            return $this->completion($this->echoItems($request, 'EN '));
        });
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name', '--limit' => 1])->assertSuccessful();
        $this->assertTrue($sawRetry);
        $this->assertNotNull(Product::query()->find(1)->name_en);
    }

    public function test_429_pauses_and_next_run_exits_early(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        Http::fake(fn () => Http::response(['error' => 'rate'], 429, ['Retry-After' => '12']));
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name'])->expectsOutputToContain('paused')->assertSuccessful();
        $this->assertNotNull(Cache::get('translation:paused_until'));
        $this->assertNull(Product::query()->find(1)->name_en);

        Http::fake(fn () => $this->fail('paused run must not call the API'));
        $this->artisan('catalog:translate', ['--lang' => 'en'])->expectsOutputToContain('paused')->assertSuccessful();
    }

    public function test_daily_token_budget_stops_cleanly(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        config(['translation.daily_token_budget' => 10]);
        Cache::put('translation:tokens:'.now()->toDateString(), 10, now()->addDay());
        Http::fake(fn () => $this->fail('over budget must not call the API'));
        $this->artisan('catalog:translate', ['--lang' => 'en'])->expectsOutputToContain('budget')->assertSuccessful();
    }

    public function test_batching_respects_max_items_and_chars(): void
    {
        config(['translation.batch_max_items' => 2, 'translation.batch_max_chars' => 6000]);
        $this->product(1, ['name_ka' => 'პანელი ერთი']);
        $this->product(2, ['name_ka' => 'პანელი ორი']);
        $this->product(3, ['name_ka' => 'პანელი სამი']);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name', '--limit' => 10])->assertSuccessful();
        $this->assertCount(2, Http::recorded());

        Http::fake(function (Request $request) {
            return $this->completion($this->echoItems($request, 'RU '));
        });
        config(['translation.batch_max_items' => 20, 'translation.batch_max_chars' => 20]);
        $this->product(4, ['name_ka' => 'სახანძრო სიგნალიზაცია პანელი']);
        $this->product(5, ['name_ka' => 'ვიდეო მეთვალყურეობის კამერა']);
        $this->artisan('catalog:translate', ['--lang' => 'ru', '--fields' => 'name', '--product' => 4, '--limit' => 1])->assertSuccessful();
        $this->artisan('catalog:translate', ['--lang' => 'ru', '--fields' => 'name', '--product' => 5, '--limit' => 1])->assertSuccessful();
        $this->assertTrue(Http::recorded()->count() >= 2);
    }

    public function test_api_key_never_appears_in_logs_or_output(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        $logs = [];
        Log::listen(function ($event) use (&$logs) {
            $logs[] = $event->message.' '.json_encode($event->context);
        });
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name', '--limit' => 1])
            ->assertSuccessful()
            ->doesntExpectOutputToContain($this->secret);
        $this->assertStringNotContainsString($this->secret, implode("\n", $logs));
    }

    public function test_hidden_and_out_of_feed_are_skipped(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი', 'is_hidden' => true]);
        $this->product(2, ['name_ka' => 'ვიდეო კამერა', 'in_feed' => false]);
        Http::fake(fn () => $this->fail('hidden products must not be translated'));
        $this->artisan('catalog:translate', ['--lang' => 'en', '--fields' => 'name'])->assertSuccessful();
    }

    public function test_dry_run_saves_nothing_and_estimate_calls_no_api(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--dry-run' => true, '--lang' => 'en', '--fields' => 'name'])->assertSuccessful();
        $this->assertNull(Product::query()->find(1)->name_en);
        $this->assertSame(0, TranslationCache::query()->count());

        Http::fake(fn () => $this->fail('estimate must not call the API'));
        config(['translation.enabled' => false, 'translation.api_key' => null]);
        $this->artisan('catalog:translate', ['--estimate' => true])->assertSuccessful();
    }

    public function test_lock_prevents_overlap(): void
    {
        $lock = Cache::lock('catalog:translate', 30);
        $this->assertTrue($lock->get());
        $this->artisan('catalog:translate', ['--lang' => 'en'])->expectsOutputToContain('in progress')->assertSuccessful();
        $lock->release();
    }

    public function test_probe_lists_models_without_database(): void
    {
        Http::fake([
            'https://api.groq.com/openai/v1/models' => Http::response(['data' => [['id' => 'openai/gpt-oss-120b']]]),
            'https://api.groq.com/openai/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => json_encode(['items' => [
                    ['id' => 'name', 'text' => 'Fire panel DS-2CD2043 4MP'],
                    ['id' => 'html', 'text' => '<p>This is a <b>detector</b>.</p>'],
                    ['id' => 'feat', 'text' => 'Resolution: 4MP'],
                ]], JSON_THROW_ON_ERROR)]]],
                'usage' => ['total_tokens' => 40],
            ]),
        ]);
        $this->artisan('catalog:translate', ['--probe' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('openai/gpt-oss-120b')
            ->doesntExpectOutputToContain($this->secret);
    }

    public function test_admin_translation_filter_and_fallback(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $this->product(1, [
            'name_ka' => 'ალფა',
            'name_en' => 'Zebra',
            'translations' => ['en' => ['name' => 'Zebra', '_manual' => ['name']]],
        ]);
        $this->product(2, [
            'name_ka' => 'ბეტა',
            'name_en' => 'Apple',
            'translations' => ['en' => ['name' => 'Apple', '_h' => ['name' => md5('ბეტა')]]],
        ]);
        $this->product(3, ['name_ka' => 'გამა']);

        $this->assertSame(1, $this->getJson('/api/admin/products?translation=manual&lang=en')->json('total'));
        $this->assertSame(1, $this->getJson('/api/admin/products?translation=machine&lang=en')->json('total'));
        $this->assertSame(1, $this->getJson('/api/admin/products?translation=missing&lang=en')->json('total'));

        $sorted = $this->getJson('/api/products?sort=name&language=en')->json('products');
        $this->assertSame('2', $sorted[0]['id']);
    }

    public function test_disabled_and_missing_key_exit_early(): void
    {
        $this->product(1, ['name_ka' => 'სახანძრო პანელი']);
        config(['translation.enabled' => false]);
        Http::fake(fn () => $this->fail('disabled'));
        $this->artisan('catalog:translate')->expectsOutputToContain('TRANSLATION_ENABLED')->assertSuccessful();
        config(['translation.enabled' => true, 'translation.api_key' => null]);
        $this->artisan('catalog:translate')->expectsOutputToContain('GROQ_API_KEY')->assertFailed();
    }

    public function test_categories_translate_and_admin_marks_manual(): void
    {
        Category::query()->create([
            'id' => 32,
            'parent_id' => null,
            'name_ka' => 'ვიდეო მეთვალყურეობა',
            'synced_at' => now(),
        ]);
        $this->echoGroq();
        $this->artisan('catalog:translate', ['--category' => true, '--lang' => 'en', '--limit' => 5])->assertSuccessful();
        $this->assertNotEmpty(Category::query()->find(32)->translations['en']['name']);

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/categories/32', ['translations' => ['en' => ['name' => 'CCTV']]])->assertOk();
        $this->assertContains('name', Category::query()->find(32)->translations['en']['_manual']);
    }

    private function product(int $id, array $attrs): Product
    {
        return Product::query()->create(array_merge([
            'id' => $id,
            'product_code' => 'P-'.$id,
            'name_ka' => 'პროდუქტი',
            'price' => 10,
            'in_stock' => true,
            'source_hash' => md5((string) $id),
            'in_feed' => true,
            'is_hidden' => false,
            'first_seen_at' => now(),
            'synced_at' => now(),
        ], $attrs));
    }

    private function echoGroq(): void
    {
        Http::fake(function (Request $request) {
            if (str_contains($request->url(), '/models')) {
                return Http::response(['data' => [['id' => 'openai/gpt-oss-120b']]]);
            }

            return $this->completion($this->echoItems($request, 'EN '));
        });
    }

    private function echoItems(Request $request, string $prefix): array
    {
        $body = $request->data();
        if ($body === [] || $body === null) {
            $body = json_decode($request->body(), true) ?: [];
        }
        $content = $body['messages'][1]['content'] ?? null;
        if (is_array($content)) {
            $payload = $content;
        } else {
            $payload = json_decode((string) $content, true) ?: [];
        }
        $items = [];
        foreach ($payload['items'] ?? [] as $item) {
            $items[] = ['id' => $item['id'], 'text' => $prefix.$item['text']];
        }

        return $items;
    }

    private function completion(array $items, int $tokens = 20): array
    {
        return [
            'choices' => [['message' => ['content' => json_encode(['items' => $items], JSON_UNESCAPED_UNICODE)]]],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 10, 'total_tokens' => $tokens],
        ];
    }
}
