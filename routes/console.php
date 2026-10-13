<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('catalog:sync')->hourly();
Schedule::command('catalog:translate --limit=60')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->when(fn () => (bool) config('translation.enabled'));
