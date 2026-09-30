<?php

/*
|--------------------------------------------------------------------------
| Category Routes – add these lines to your routes/api.php
|--------------------------------------------------------------------------
|
| Public endpoint (no auth): GET /api/v1/categories  &  GET /api/v1/categories/{id}
| Protected endpoints (admin, auth:sanctum): POST / PUT / DELETE
|
*/

use App\Http\Controllers\Api\V1\CategoryController;

// ── Public ────────────────────────────────────────────────────────────────
Route::prefix('v1')->group(function () {
    Route::get('/categories',        [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
});

// ── Admin (protected) ─────────────────────────────────────────────────────
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::post('/categories',              [CategoryController::class, 'store']);
    Route::put('/categories/{category}',    [CategoryController::class, 'update']);
    Route::patch('/categories/{category}',  [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
});
