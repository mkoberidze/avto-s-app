<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GeorgianOnlyMigrationTest extends TestCase
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
    }

    public function test_fresh_database_has_no_multilingual_columns(): void
    {
        $this->assertFalse(Schema::hasColumn('products', 'translations'));
        $this->assertFalse(Schema::hasColumn('products', 'source_hash'));
        $this->assertFalse(Schema::hasColumn('products', 'name_en'));
        $this->assertFalse(Schema::hasColumn('products', 'name_ru'));
        $this->assertFalse(Schema::hasColumn('categories', 'translations'));
        $this->assertFalse(Schema::hasColumn('orders', 'language'));
        $this->assertFalse(Schema::hasTable('translation_cache'));
    }

    public function test_migration_is_safe_when_translation_columns_already_exist_and_down_works(): void
    {
        $this->artisan('migrate:rollback', [
            '--path' => 'database/migrations/2026_10_23_000019_drop_multilingual_catalog_columns.php',
        ])->assertSuccessful();

        $this->assertTrue(Schema::hasColumn('products', 'translations'));
        $this->assertTrue(Schema::hasColumn('products', 'source_hash'));
        $this->assertTrue(Schema::hasColumn('orders', 'language'));

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'name_en')) {
                $table->string('name_en', 500)->nullable()->index();
            }
            if (! Schema::hasColumn('products', 'name_ru')) {
                $table->string('name_ru', 500)->nullable()->index();
            }
        });

        if (! Schema::hasTable('translation_cache')) {
            Schema::create('translation_cache', function (Blueprint $table) {
                $table->id();
                $table->char('source_hash', 32);
                $table->string('lang', 2);
                $table->text('source_text');
                $table->text('translated_text');
                $table->timestamps();
                $table->unique(['source_hash', 'lang']);
            });
        }

        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_10_23_000019_drop_multilingual_catalog_columns.php',
        ])->assertSuccessful();

        $this->assertFalse(Schema::hasColumn('products', 'translations'));
        $this->assertFalse(Schema::hasColumn('products', 'source_hash'));
        $this->assertFalse(Schema::hasColumn('products', 'name_en'));
        $this->assertFalse(Schema::hasColumn('products', 'name_ru'));
        $this->assertFalse(Schema::hasColumn('categories', 'translations'));
        $this->assertFalse(Schema::hasColumn('orders', 'language'));
        $this->assertFalse(Schema::hasTable('translation_cache'));

        $this->artisan('migrate:rollback', [
            '--path' => 'database/migrations/2026_10_23_000019_drop_multilingual_catalog_columns.php',
        ])->assertSuccessful();

        $this->assertTrue(Schema::hasColumn('products', 'translations'));
        $this->assertTrue(Schema::hasColumn('products', 'source_hash'));
        $this->assertTrue(Schema::hasColumn('categories', 'translations'));
        $this->assertTrue(Schema::hasColumn('orders', 'language'));
    }
}
