const fs = require('fs');
const path = require('path');

const target1 = 'C:\\xampp\\htdocs\\dhobi_backend\\routes\\api.php';
const target2 = 'c:\\CODEXXA_PROJECT\\Dhobi_app\\backend_laravel\\routes\\api.php';

const routesCode = `<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\Api\\V1\\AuthController;
use App\\Http\\Controllers\\Api\\V1\\OrderController;
use App\\Http\\Controllers\\Api\\V1\\LaundryOwnerController;
use App\\Http\\Controllers\\Api\\V1\\DeliveryBoyController;
use App\\Http\\Controllers\\Api\\V1\\AdminDashboardController;
use App\\Http\\Controllers\\Api\\V1\\ShopController;
use App\\Http\\Controllers\\Api\\V1\\CategoryController;

/*
|--------------------------------------------------------------------------
| DhobiPro Complete Unified REST API Routes
|--------------------------------------------------------------------------
|
| Unified REST API backend for:
| 1. Customer App (React Native)
| 2. Laundry Owner / Partner App (React Native)
| 3. Delivery Boy App (React Native)
| 4. Admin Web Panel (React.js)
|
*/

Route::prefix('v1')->group(function () {

    // ──────────────────────────────────────────────
    // 1. PUBLIC & AUTH APIs
    // ──────────────────────────────────────────────
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Shops & Categories
    Route::get('/shops', [ShopController::class, 'index']);
    Route::get('/shops/popular', [ShopController::class, 'popular']);
    Route::get('/shops/nearby', [ShopController::class, 'nearby']);
    Route::get('/shops/{id}', [ShopController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);

    // ──────────────────────────────────────────────
    // 2. CUSTOMER APP CRUD APIs
    // ──────────────────────────────────────────────
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
    Route::post('/orders/{id}/rate', [OrderController::class, 'rate']);

    // ──────────────────────────────────────────────
    // 3. LAUNDRY OWNER / PARTNER APP CRUD APIs
    // ──────────────────────────────────────────────
    Route::prefix('owner')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/register-shop', [LaundryOwnerController::class, 'registerShop']);
        Route::post('/documents', [LaundryOwnerController::class, 'uploadDocument']);
        Route::get('/orders', [LaundryOwnerController::class, 'orders']);
        Route::put('/orders/{id}/status', [LaundryOwnerController::class, 'updateOrderStatus']);
        Route::post('/orders/{id}/status', [LaundryOwnerController::class, 'updateOrderStatus']);
        Route::post('/orders/{id}/assign-delivery', [LaundryOwnerController::class, 'assignDeliveryBoy']);
        Route::get('/services', [LaundryOwnerController::class, 'services']);
        Route::post('/services', [LaundryOwnerController::class, 'storeService']);
    });

    // Also support /laundry/ path for backward compatibility
    Route::prefix('laundry')->group(function () {
        Route::post('/register-shop', [LaundryOwnerController::class, 'registerShop']);
        Route::post('/upload-document', [LaundryOwnerController::class, 'uploadDocument']);
        Route::get('/orders', [LaundryOwnerController::class, 'orders']);
        Route::post('/orders/{id}/status', [LaundryOwnerController::class, 'updateOrderStatus']);
        Route::post('/orders/{id}/assign-delivery', [LaundryOwnerController::class, 'assignDeliveryBoy']);
    });

    // ──────────────────────────────────────────────
    // 4. DELIVERY BOY APP CRUD APIs
    // ──────────────────────────────────────────────
    Route::prefix('delivery')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/duty-toggle', [DeliveryBoyController::class, 'toggleDuty']);
        Route::get('/assignments', [DeliveryBoyController::class, 'tasks']);
        Route::get('/tasks', [DeliveryBoyController::class, 'tasks']);
        Route::post('/location', [DeliveryBoyController::class, 'updateLocation']);
        Route::post('/orders/{id}/pickup-verify', [DeliveryBoyController::class, 'verifyPickup']);
        Route::post('/orders/{id}/delivery-verify', [DeliveryBoyController::class, 'verifyDelivery']);
        Route::put('/assignments/{id}/status', [DeliveryBoyController::class, 'verifyPickup']);
    });

    // ──────────────────────────────────────────────
    // 5. ADMIN WEB PANEL CRUD APIs
    // ──────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/laundries', [AdminDashboardController::class, 'laundries']);
        Route::post('/laundries/{id}/approve', [AdminDashboardController::class, 'approveLaundry']);
        Route::post('/laundries/{id}/reject', [AdminDashboardController::class, 'rejectLaundry']);
        Route::post('/laundries/{id}/request-docs', [AdminDashboardController::class, 'requestDocs']);
        Route::post('/laundries/{id}/status', [AdminDashboardController::class, 'setStatus']);
        Route::get('/delivery-boys', [AdminDashboardController::class, 'deliveryBoys']);
        Route::get('/verifications', [AdminDashboardController::class, 'laundries']);
        Route::post('/verifications/{id}/approve', [AdminDashboardController::class, 'approveLaundry']);
        Route::post('/verifications/{id}/reject', [AdminDashboardController::class, 'rejectLaundry']);
        Route::get('/activity-logs', [AdminDashboardController::class, 'activityLogs']);
        Route::post('/refunds/{id}/process', [AdminDashboardController::class, 'processRefund']);
    });
});
`;

fs.writeFileSync(target1, routesCode);
fs.writeFileSync(target2, routesCode);
console.log('Routes written successfully to target1 and target2');
