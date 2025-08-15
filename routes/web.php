<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// SPA catch-all to let React Router handle client routes (exclude /api/*)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '^(?!api).*$');
