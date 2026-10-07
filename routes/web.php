<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// SPA catch-all to let React Router handle client routes (exclude /api/* and /storage/*)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '^(?!api)(?!storage)(?!favicon\.ico)(?!robots\.txt).*$');

Route::get('/api/check-ip', function () {
    return 'test';
});