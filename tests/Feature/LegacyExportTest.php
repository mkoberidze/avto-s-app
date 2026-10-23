<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LegacyExportTest extends TestCase
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

        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        Storage::fake('local');
    }

    public function test_legacy_export_writes_forms_and_pages(): void
    {
        $user = User::factory()->create(['phone' => '+995555111001']);
        DB::table('forms')->insert([
            'user_id' => $user->id,
            'title' => 'Fire',
            'slug' => 'fire-1',
            'status' => 'unopened',
            'description' => 'desc',
            'input_one' => 'a',
            'input_two' => 'b',
            'input_three' => 'c',
            'schema' => null,
            'attachment_url' => 'http://example.test/storage/attachments/a.pdf',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('pages')->insert([
            'slug' => 'about',
            'title_ka' => 'ჩვენ',
            'title_en' => 'About',
            'body_ka' => 'ტექსტი',
            'body_en' => 'text',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('legacy:export')->assertSuccessful();

        $files = Storage::disk('local')->files('exports');
        $this->assertNotEmpty($files);
        $payload = json_decode(Storage::disk('local')->get($files[0]), true);
        $this->assertSame(1, $payload['counts']['forms']);
        $this->assertSame(1, $payload['counts']['pages']);
        $this->assertSame('+995555111001', $payload['forms'][0]['user_phone']);
        $this->assertSame('http://example.test/storage/attachments/a.pdf', $payload['forms'][0]['attachment_url']);
        $this->assertSame('about', $payload['pages'][0]['slug']);
    }
}
