<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AppDoctorTest extends TestCase
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

    public function test_feeds_only_reports_http_status(): void
    {
        config([
            'catalog.products_url' => 'https://shop.neotech.ge/data/products.json',
            'catalog.categories_url' => 'https://shop.neotech.ge/data/category.json',
        ]);
        Http::fake([
            'https://shop.neotech.ge/data/products.json' => Http::response('[]', 200),
            'https://shop.neotech.ge/data/category.json' => Http::response('[]', 403),
        ]);

        $this->artisan('app:doctor', ['--feeds-only' => true])
            ->expectsOutputToContain('OK    products feed HTTP 200')
            ->expectsOutputToContain('WARN  categories feed HTTP 403')
            ->assertSuccessful();
    }

    public function test_feeds_only_fails_when_unreachable(): void
    {
        config([
            'catalog.products_url' => 'https://shop.neotech.ge/data/products.json',
            'catalog.categories_url' => 'https://shop.neotech.ge/data/category.json',
        ]);
        Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('offline');
        });

        $this->artisan('app:doctor', ['--feeds-only' => true])
            ->expectsOutputToContain('FAIL  products feed unreachable')
            ->assertFailed();
    }
}
