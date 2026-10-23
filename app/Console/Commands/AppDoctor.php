<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

class AppDoctor extends Command
{
    protected $signature = 'app:doctor {--feeds-only : Only probe catalog feed URLs}';

    protected $description = 'Check production readiness without printing secrets';

    private int $fails = 0;

    public function handle(): int
    {
        if ($this->option('feeds-only')) {
            $this->checkFeeds();

            return $this->fails > 0 ? self::FAILURE : self::SUCCESS;
        }

        $this->checkPhp();
        $this->checkExtensions();
        $this->checkIni('memory_limit', ini_get('memory_limit'));
        $this->checkIni('max_execution_time', (string) ini_get('max_execution_time'));
        $this->checkWritable(storage_path(), 'storage');
        $this->checkWritable(base_path('bootstrap/cache'), 'bootstrap/cache');
        $this->checkStorageLink();
        $this->checkDatabase();
        $this->checkEnv();
        $this->checkSms();
        $this->checkQueue();
        $this->checkAdmin();
        $this->checkSanctum();
        $this->line('WARN  Add cron: * * * * * php '.base_path('artisan').' schedule:run');
        $this->checkFeeds();
        $this->checkSmsHost();

        return $this->fails > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function markOk(string $message): void
    {
        $this->line("OK    {$message}");
    }

    private function markWarn(string $message): void
    {
        $this->line("WARN  {$message}");
    }

    private function markFail(string $message): void
    {
        $this->fails++;
        $this->line("FAIL  {$message}");
    }

    private function checkPhp(): void
    {
        if (version_compare(PHP_VERSION, '8.2.0', '>=')) {
            $this->markOk('PHP '.PHP_VERSION);
        } else {
            $this->markFail('PHP '.PHP_VERSION.' (need >= 8.2)');
        }
    }

    private function checkExtensions(): void
    {
        $driver = config('database.default');
        $pdo = $driver === 'sqlite' ? 'pdo_sqlite' : 'pdo_mysql';
        foreach ([$pdo, 'mbstring', 'openssl', 'curl', 'dom', 'fileinfo', 'json', 'ctype', 'xml'] as $ext) {
            if (extension_loaded($ext) || $ext === 'json') {
                $this->markOk("extension {$ext}");
            } else {
                $this->markFail("missing extension {$ext}");
            }
        }
    }

    private function checkIni(string $name, string $value): void
    {
        $this->markOk("{$name}={$value}");
    }

    private function checkWritable(string $path, string $label): void
    {
        if (is_dir($path) && is_writable($path)) {
            $this->markOk("{$label} writable");
        } else {
            $this->markFail("{$label} not writable");
        }
    }

    private function checkStorageLink(): void
    {
        $link = public_path('storage');
        if (is_link($link) || is_dir($link)) {
            $this->markOk('public/storage link');
        } else {
            $this->markFail('public/storage link missing');
        }
    }

    private function checkDatabase(): void
    {
        try {
            DB::connection()->getPdo();
            $this->markOk('database connection');
        } catch (\Throwable $e) {
            $this->markFail('database connection');

            return;
        }

        if (! Schema::hasTable('migrations')) {
            $this->markFail('migrations table missing');

            return;
        }

        $files = collect(glob(database_path('migrations/*.php')) ?: [])
            ->map(fn (string $file) => pathinfo($file, PATHINFO_FILENAME));
        $ran = collect(DB::table('migrations')->pluck('migration'));
        $pending = $files->diff($ran)->values();
        if ($pending->isEmpty()) {
            $this->markOk('migrations up to date');
        } else {
            $this->markFail('pending migrations: '.$pending->count());
        }
    }

    private function checkEnv(): void
    {
        $env = (string) config('app.env');
        $debug = (bool) config('app.debug');
        if ($env === 'production') {
            $this->markOk('APP_ENV=production');
        } else {
            $this->markWarn('APP_ENV='.$env);
        }
        if ($debug) {
            $this->markWarn('APP_DEBUG=true');
        } else {
            $this->markOk('APP_DEBUG=false');
        }
    }

    private function checkSms(): void
    {
        $driver = (string) config('services.sms_driver', 'ubill');
        if ($driver === '') {
            $this->markFail('SMS_DRIVER missing');

            return;
        }
        $this->markOk('SMS_DRIVER='.$driver);
        if ($driver === 'ubill' && (! config('services.ubill.api_key') || ! config('services.ubill.brand_id'))) {
            $this->markWarn('UBILL credentials not set');
        }
    }

    private function checkQueue(): void
    {
        $queue = (string) config('queue.default');
        if ($queue === 'sync') {
            $this->markOk('QUEUE_CONNECTION=sync');
        } else {
            $this->markWarn('QUEUE_CONNECTION='.$queue.' (production has no queue worker)');
        }
    }

    private function checkAdmin(): void
    {
        $phone = (string) config('admin.phone');
        if ($phone === '' || $phone === '+10000000000') {
            $this->markWarn('ADMIN_PHONE not set');
        } else {
            $this->markOk('ADMIN_PHONE set');
        }

        try {
            if (! class_exists(Role::class) || ! Schema::hasTable('roles')) {
                $this->markFail('admin user check skipped (roles missing)');

                return;
            }
            $exists = User::role('admin')->exists();
            if ($exists) {
                $this->markOk('admin user exists');
            } else {
                $this->markFail('no admin user');
            }
        } catch (\Throwable $e) {
            $this->markFail('admin user check failed');
        }
    }

    private function checkSanctum(): void
    {
        $raw = env('SANCTUM_TOKEN_EXPIRATION');
        if ($raw === null || $raw === '') {
            $this->markWarn('SANCTUM_TOKEN_EXPIRATION not set (default in use)');
        } else {
            $this->markOk('SANCTUM_TOKEN_EXPIRATION set');
        }
    }

    private function checkFeeds(): void
    {
        $this->probe('products feed', (string) config('catalog.products_url'));
        $this->probe('categories feed', (string) config('catalog.categories_url'));
    }

    private function checkSmsHost(): void
    {
        $this->probe('SMS host', 'https://api.ubill.dev', true);
    }

    private function probe(string $label, string $url, bool $anyHttpOk = false): void
    {
        if ($url === '' || str_starts_with($url, '/') || str_starts_with($url, 'file:')) {
            $this->markWarn("{$label} is a local path (skipped HTTP)");

            return;
        }

        $status = $this->httpStatus($url);
        if ($status === null) {
            $this->markFail("{$label} unreachable");

            return;
        }
        if ($anyHttpOk) {
            $this->markOk("{$label} HTTP {$status}");

            return;
        }
        if ($status === 403) {
            $this->markWarn("{$label} HTTP 403 (server IP not whitelisted)");

            return;
        }
        if ($status >= 200 && $status < 400) {
            $this->markOk("{$label} HTTP {$status}");

            return;
        }
        $this->markWarn("{$label} HTTP {$status}");
    }

    private function httpStatus(string $url): ?int
    {
        try {
            $head = Http::timeout(10)->withOptions(['http_errors' => false])->head($url);
            if ($head->status() > 0) {
                return $head->status();
            }
        } catch (\Throwable $e) {
            // fall through to GET
        }
        try {
            $get = Http::timeout(10)->withOptions(['http_errors' => false])->get($url);

            return $get->status() > 0 ? $get->status() : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
