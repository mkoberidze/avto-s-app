<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\AdminProductController;
use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\AdminMessageController;

Route::prefix('auth')->group(function () {
    Route::post('/otp/request', [AuthController::class, 'requestOtp']);
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::post('contact', [ContactController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('user', [AuthController::class, 'getUser']);
    Route::patch('user', [AuthController::class, 'updateUser']);
    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'store']);
    Route::get('orders/{id}', [OrderController::class, 'show'])->whereNumber('id');
    Route::get('orders/{id}/attachment', [OrderController::class, 'attachment'])->whereNumber('id');
});

Route::get('settings', [SettingsController::class, 'index']);

Route::middleware('throttle:120,1')->group(function () {
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('brands', [CatalogController::class, 'brands']);
    Route::get('products', [CatalogController::class, 'products']);
    Route::get('products/{id}', [CatalogController::class, 'show'])->whereNumber('id');
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::post('/settings/upload-logo', [SettingsController::class, 'uploadLogo']);
    Route::post('/settings/upload-favicon', [SettingsController::class, 'uploadFavicon']);
    Route::post('/settings/upload-carousel', [SettingsController::class, 'uploadCarouselImage']);
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'update']);
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::get('/products/{id}', [AdminProductController::class, 'show'])->whereNumber('id');
    Route::put('/products/{id}', [AdminProductController::class, 'update'])->whereNumber('id');
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update'])->whereNumber('id');
    Route::get('/dashboard', [AdminOrderController::class, 'dashboard']);
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show'])->whereNumber('id');
    Route::get('/orders/{id}/attachment', [AdminOrderController::class, 'attachment'])->whereNumber('id');
    Route::patch('/orders/{id}', [AdminOrderController::class, 'update'])->whereNumber('id');
    Route::get('/messages', [AdminMessageController::class, 'index']);
    Route::patch('/messages/{id}', [AdminMessageController::class, 'update'])->whereNumber('id');
});
