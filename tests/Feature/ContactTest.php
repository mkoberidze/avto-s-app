<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ContactTest extends TestCase
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

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        RateLimiter::clear('contact-ip:127.0.0.1');
        config([
            'services.ubill.api_key' => 'test-key',
            'services.ubill.brand_id' => '1',
        ]);
        Http::fake(['https://api.ubill.dev/*' => Http::response('ok', 200)]);
    }

    public function test_validation(): void
    {
        $this->postJson('/api/contact', [])->assertStatus(422);
        $this->postJson('/api/contact', [
            'name' => 'Nika',
            'phone' => '123',
            'message' => 'hello there',
        ])->assertStatus(422);
        $this->postJson('/api/contact', [
            'name' => 'Nika',
            'phone' => '+995555111001',
            'email' => 'not-an-email',
            'message' => 'hello there',
        ])->assertStatus(422);
        $this->postJson('/api/contact', [
            'name' => 'Nika',
            'phone' => '+995555111001',
            'message' => 'hey',
        ])->assertStatus(422);
    }

    public function test_success_and_honeypot_stores_nothing(): void
    {
        $this->postJson('/api/contact', [
            'name' => 'Nika',
            'phone' => '555111001',
            'email' => 'nika@example.com',
            'message' => 'გამარჯობა, მჭირდება კონსულტაცია',
        ])->assertCreated()->assertJson(['status' => 'ok']);

        $this->assertSame(1, ContactMessage::query()->count());
        $this->assertSame('+995555111001', ContactMessage::query()->first()->phone);

        $this->postJson('/api/contact', [
            'name' => 'Bot',
            'phone' => '+995555111002',
            'message' => 'spam message here',
            'website' => 'https://spam.example',
        ])->assertCreated()->assertJson(['status' => 'ok']);

        $this->assertSame(1, ContactMessage::query()->count());
    }

    public function test_throttle_per_phone(): void
    {
        $payload = [
            'name' => 'Nika',
            'phone' => '+995555222001',
            'message' => 'hello there friends',
        ];
        $this->postJson('/api/contact', $payload)->assertCreated();
        $this->postJson('/api/contact', $payload)->assertCreated();
        $this->postJson('/api/contact', $payload)->assertCreated();
        $this->postJson('/api/contact', $payload)->assertStatus(429);
    }

    public function test_contact_sms_goes_to_admin_and_shop_phone(): void
    {
        config([
            'services.sms_driver' => 'log',
            'services.sms_notify_phones' => ['+995 599 677 003'],
        ]);
        $admin = User::factory()->create(['phone' => '+995555000001']);
        $admin->assignRole('admin');

        $phones = [];
        Log::listen(function ($event) use (&$phones) {
            if ($event->message === 'SMS') {
                $phones[] = $event->context['phone'] ?? null;
            }
        });

        $this->postJson('/api/contact', [
            'name' => 'Goga',
            'phone' => '+995555333002',
            'message' => 'hello there friends',
        ])->assertCreated();

        $this->assertContains('+995555000001', $phones);
        $this->assertContains('+995599677003', $phones);
        $this->assertCount(2, array_unique($phones));
    }

    public function test_sms_failure_does_not_fail_request(): void
    {
        $admin = User::factory()->create(['phone' => '+995555000001']);
        $admin->assignRole('admin');
        Http::fake(['https://api.ubill.dev/*' => Http::response('fail', 500)]);

        $this->postJson('/api/contact', [
            'name' => 'Nika',
            'phone' => '+995555333001',
            'message' => 'hello there friends',
        ])->assertCreated();

        $this->assertSame(1, ContactMessage::query()->count());
    }

    public function test_admin_only_and_handled_toggle(): void
    {
        ContactMessage::query()->create([
            'name' => 'Nika',
            'phone' => '+995555111001',
            'email' => null,
            'message' => 'hello there',
            'handled' => false,
            'ip' => '127.0.0.1',
        ]);

        $this->getJson('/api/admin/messages')->assertUnauthorized();

        $user = User::factory()->create(['phone' => '+995555444001']);
        $user->assignRole('user');
        Sanctum::actingAs($user);
        $this->getJson('/api/admin/messages')->assertForbidden();
        $this->patchJson('/api/admin/messages/1', ['handled' => true])->assertForbidden();

        $admin = User::factory()->create(['phone' => '+995555444002']);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $list = $this->getJson('/api/admin/messages?handled=0')->assertOk();
        $this->assertSame(1, $list->json('total'));
        $id = $list->json('messages.0.id');

        $this->patchJson('/api/admin/messages/'.$id, ['handled' => true])
            ->assertOk()
            ->assertJsonPath('handled', true);

        $this->getJson('/api/admin/messages?handled=1')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/admin/messages?handled=0')->assertOk()->assertJsonPath('total', 0);
    }
}
