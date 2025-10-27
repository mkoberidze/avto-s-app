<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\AdminPageController;
use App\Http\Controllers\SettingsController;

Route::prefix('auth')->group(function () {
    Route::post('/otp/request', [AuthController::class, 'requestOtp']);
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->prefix('forms')->group(function () {
    Route::get('/', [FormController::class, 'index']);
    Route::post('/', [FormController::class, 'store']);
    Route::get('/{id}', [FormController::class, 'show']);
    Route::put('/{id}', [FormController::class, 'update']);
    Route::delete('/{id}', [FormController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('user', [AuthController::class, 'getUser']);
});

// Public pages
Route::get('pages/{slug}', [PageController::class, 'show']);

// Public settings
Route::get('settings', [SettingsController::class, 'index']);

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/forms', [AdminController::class, 'index']);
    Route::get('/forms/{id}', [AdminController::class, 'show']);
    Route::put('/forms/{id}/status', [AdminController::class, 'updateFormStatus']);
    // Admin manage pages
    Route::get('/pages/{slug}', [AdminPageController::class, 'get']);
    Route::post('/pages/{slug}', [AdminPageController::class, 'upsert']);
    // Admin manage settings
    Route::post('/settings/upload-logo', [SettingsController::class, 'uploadLogo']);
    Route::post('/settings/upload-favicon', [SettingsController::class, 'uploadFavicon']);
    Route::post('/settings/upload-carousel', [SettingsController::class, 'uploadCarouselImage']);
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'update']);
});

