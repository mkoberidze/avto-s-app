<?php

namespace Tests\Feature;

use App\Models\User;
use Ichtrojan\Otp\Models\Otp as OtpModel;
use Ichtrojan\Otp\Otp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthOtpTest extends TestCase
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
            'services.ubill.api_key' => 'test-key',
            'services.ubill.brand_id' => '1',
            'sanctum.expiration' => 43200,
        ]);

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
    }

    public function test_otp_request_returns_only_status_and_expires_and_does_not_create_user(): void
    {
        Http::fake(['https://api.ubill.dev/*' => Http::response('ok', 200)]);

        $phone = '+995555111001';
        $res = $this->postJson('/api/auth/otp/request', ['phone' => $phone])
            ->assertOk()
            ->assertExactJson(['status' => 'ok', 'expires_in' => 600]);

        $json = $res->json();
        $this->assertArrayNotHasKey('response', $json);
        $this->assertArrayNotHasKey('user_exists', $json);
        $this->assertArrayNotHasKey('message', $json);
        $this->assertDatabaseMissing('users', ['phone' => $phone]);
        $this->assertTrue(OtpModel::query()->where('identifier', $phone)->where('valid', true)->exists());
    }

    public function test_user_is_created_on_successful_verify(): void
    {
        $phone = '+995555111002';
        $otp = (new Otp())->generate($phone, 'numeric', 6, 10);

        $this->assertDatabaseMissing('users', ['phone' => $phone]);

        $this->postJson('/api/auth/otp/verify', [
            'phone' => $phone,
            'otp' => $otp->token,
        ])->assertOk()->assertJsonPath('user.phone', $phone);

        $this->assertDatabaseHas('users', ['phone' => $phone]);
    }

    public function test_otp_request_rate_limit_returns_429_with_retry_after(): void
    {
        Http::fake(['https://api.ubill.dev/*' => Http::response('ok', 200)]);
        $phone = '+995555111003';

        $this->postJson('/api/auth/otp/request', ['phone' => $phone])->assertOk();
        $this->postJson('/api/auth/otp/request', ['phone' => $phone])
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after'])
            ->assertJsonPath('message', 'too_many_attempts');
        $this->assertIsInt($this->postJson('/api/auth/otp/request', ['phone' => $phone])->json('retry_after'));
    }

    public function test_otp_request_hour_limit_per_phone(): void
    {
        Http::fake(['https://api.ubill.dev/*' => Http::response('ok', 200)]);
        $phone = '+995555111004';

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/otp/request', ['phone' => $phone])->assertOk();
            $this->travel(61)->seconds();
        }

        $this->postJson('/api/auth/otp/request', ['phone' => $phone])
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after']);
    }

    public function test_otp_request_hour_limit_per_ip(): void
    {
        Http::fake(['https://api.ubill.dev/*' => Http::response('ok', 200)]);

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/auth/otp/request', ['phone' => '+9955551'.str_pad((string) $i, 5, '0', STR_PAD_LEFT)])
                ->assertOk();
        }

        $this->postJson('/api/auth/otp/request', ['phone' => '+995555199999'])
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after']);
    }

    public function test_verify_rate_limit_and_reset_on_success(): void
    {
        $phone = '+995555111005';
        $otp = (new Otp())->generate($phone, 'numeric', 6, 10);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/otp/verify', ['phone' => $phone, 'otp' => '000000'])->assertStatus(422);
        }

        $this->postJson('/api/auth/otp/verify', ['phone' => $phone, 'otp' => '000000'])
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after']);

        $this->travel(11)->minutes();

        $fresh = (new Otp())->generate($phone, 'numeric', 6, 10);
        $this->postJson('/api/auth/otp/verify', ['phone' => $phone, 'otp' => $fresh->token])->assertOk();

        $this->postJson('/api/auth/otp/verify', ['phone' => $phone, 'otp' => '000000'])->assertStatus(422);
    }

    public function test_sms_failure_returns_503_and_invalidates_code(): void
    {
        Http::fake(['https://api.ubill.dev/*' => Http::response('fail', 500)]);
        $phone = '+995555111006';

        $this->postJson('/api/auth/otp/request', ['phone' => $phone])
            ->assertStatus(503)
            ->assertJson(['message' => 'sms_failed']);

        $this->assertFalse(OtpModel::query()->where('identifier', $phone)->where('valid', true)->exists());
        $this->assertTrue(OtpModel::query()->where('identifier', $phone)->exists());
    }

    public function test_token_has_expiry(): void
    {
        $phone = '+995555111007';
        $otp = (new Otp())->generate($phone, 'numeric', 6, 10);

        $res = $this->postJson('/api/auth/otp/verify', [
            'phone' => $phone,
            'otp' => $otp->token,
        ])->assertOk();

        $plain = $res->json('token');
        $id = explode('|', $plain)[0];
        $record = PersonalAccessToken::query()->find($id);
        $this->assertNotNull($record->expires_at);
        $this->assertSame(43200, (int) config('sanctum.expiration'));
        $this->assertEqualsWithDelta(now()->addMinutes(43200)->timestamp, $record->expires_at->timestamp, 5);

        config(['sanctum.stateful' => []]);
        $this->withToken($plain)->getJson('/api/user')->assertOk();
        $record->forceFill([
            'created_at' => now()->subMinutes(50000),
            'expires_at' => now()->subMinute(),
        ])->save();
        $this->assertTrue($record->fresh()->expires_at->isPast());
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->withToken($plain)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_patch_user_validates_and_returns_user_shape(): void
    {
        $user = User::factory()->create(['phone' => '+995555111008', 'name' => 'Old']);
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $this->patchJson('/api/user', ['name' => ''])->assertStatus(422);
        $this->patchJson('/api/user', ['name' => str_repeat('a', 101)])->assertStatus(422);

        $this->patchJson('/api/user', ['name' => '  Nika  '])
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('user.name', 'Nika')
            ->assertJsonPath('user.phone', $user->phone)
            ->assertJsonStructure(['status', 'user' => ['id', 'phone', 'name', 'role']]);
    }
}
