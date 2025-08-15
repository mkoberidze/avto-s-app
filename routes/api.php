<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormController;
use App\Http\Controllers\AdminController;

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

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/forms', [AdminController::class, 'index']);
    Route::put('/forms/{id}/status', [AdminController::class, 'updateFormStatus']);
});

