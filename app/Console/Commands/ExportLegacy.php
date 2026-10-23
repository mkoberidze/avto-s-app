<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ExportLegacy extends Command
{
    protected $signature = 'legacy:export';

    protected $description = 'Export forms and CMS pages rows to storage/app/exports';

    public function handle(): int
    {
        $forms = [];
        if (Schema::hasTable('forms')) {
            $query = DB::table('forms')->orderBy('forms.id');
            if (Schema::hasTable('users')) {
                $query->leftJoin('users', 'users.id', '=', 'forms.user_id')
                    ->select('forms.*', 'users.phone as user_phone');
            }
            $forms = $query->get()->map(function ($row) {
                $item = (array) $row;
                $item['user_phone'] = $item['user_phone'] ?? null;
                $item['attachment_url'] = $item['attachment_url'] ?? null;

                return $item;
            })->all();
        }

        $pages = [];
        if (Schema::hasTable('pages')) {
            $pages = DB::table('pages')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        }

        $payload = [
            'exported_at' => now()->toISOString(),
            'counts' => [
                'forms' => count($forms),
                'pages' => count($pages),
            ],
            'forms' => $forms,
            'pages' => $pages,
        ];

        $name = 'legacy-'.now()->format('Ymd-His').'.json';
        $path = 'exports/'.$name;
        Storage::disk('local')->put($path, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        $this->info('Wrote storage/app/'.$path);
        $this->info('forms: '.count($forms).' | pages: '.count($pages));

        return self::SUCCESS;
    }
}
