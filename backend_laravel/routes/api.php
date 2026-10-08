<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\LaundryOwnerController;
use App\Http\Controllers\Api\V1\DeliveryBoyController;
use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\ShopController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\WalletController;

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
    Route::post('/auth/register', [AuthController::class, 'login']);
    Route::post('/auth/send-otp', [AuthController::class, 'sendOtp']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);

    // Shops & Categories
    Route::get('/shops', [ShopController::class, 'index']);
    Route::get('/shops/popular', [ShopController::class, 'popular']);
    Route::get('/shops/nearby', [ShopController::class, 'nearby']);
    Route::get('/shops/{id}', [ShopController::class, 'show']);
    Route::get('/reels', [ShopController::class, 'getReels']);
    Route::get('/banners', [CategoryController::class, 'banners']);
    Route::post('/banners', [CategoryController::class, 'storeBanner']);
    Route::delete('/banners/{id}', [CategoryController::class, 'deleteBanner']);
    Route::post('/banners/{id}/status', [CategoryController::class, 'toggleBannerStatus']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    Route::get('/services/master', [CategoryController::class, 'masterServices']);
    Route::post('/services/master', [CategoryController::class, 'storeMasterService']);

    // ──────────────────────────────────────────────
    // 2. CUSTOMER APP CRUD APIs
    // ──────────────────────────────────────────────
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
    Route::post('/orders/{id}/confirm-availability', [OrderController::class, 'confirmAvailability']);
    Route::post('/orders/{id}/rate', [OrderController::class, 'rate']);

    // Wallet APIs
    Route::get('/wallet', [WalletController::class, 'index']);
    Route::get('/wallet/transactions', [WalletController::class, 'transactions']);
    Route::post('/wallet/add', [WalletController::class, 'add']);
    Route::post('/wallet/verify-payment', [WalletController::class, 'verifyPayment']);

    // ──────────────────────────────────────────────
    // 3. LAUNDRY OWNER / PARTNER APP CRUD APIs
    // ──────────────────────────────────────────────
    Route::prefix('owner')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/register-shop', [LaundryOwnerController::class, 'registerShop']);
        Route::get('/shop-status', [LaundryOwnerController::class, 'shopStatus']);
        Route::get('/dashboard', [LaundryOwnerController::class, 'dashboardStats']);
        Route::get('/profile', [LaundryOwnerController::class, 'profile']);
        Route::put('/profile', [LaundryOwnerController::class, 'updateProfile']);
        Route::post('/profile', [LaundryOwnerController::class, 'updateProfile']);
        Route::post('/documents', [LaundryOwnerController::class, 'uploadDocument']);
        Route::get('/orders', [LaundryOwnerController::class, 'orders']);
        Route::post('/orders', [LaundryOwnerController::class, 'storeOrder']);
        Route::get('/orders/{id}', [LaundryOwnerController::class, 'showOrder']);
        Route::post('/orders/{id}/accept', [LaundryOwnerController::class, 'acceptOrder']);
        Route::post('/orders/{id}/reject', [LaundryOwnerController::class, 'rejectOrder']);
        Route::put('/orders/{id}/status', [LaundryOwnerController::class, 'updateOrderStatus']);
        Route::post('/orders/{id}/status', [LaundryOwnerController::class, 'updateOrderStatus']);
        Route::put('/orders/{id}/payment', [LaundryOwnerController::class, 'updatePayment']);
        Route::post('/orders/{id}/payment', [LaundryOwnerController::class, 'updatePayment']);
        Route::post('/orders/{id}/assign-delivery', [LaundryOwnerController::class, 'assignDeliveryBoy']);
        Route::get('/services', [LaundryOwnerController::class, 'services']);
        Route::post('/services', [LaundryOwnerController::class, 'storeService']);
        Route::put('/services/{id}', [LaundryOwnerController::class, 'updateService']);
        Route::delete('/services/{id}', [LaundryOwnerController::class, 'deleteService']);
        Route::post('/services/sync', [LaundryOwnerController::class, 'syncServices']);
        Route::get('/customers', [LaundryOwnerController::class, 'customers']);
        Route::get('/delivery-boys', [LaundryOwnerController::class, 'deliveryBoys']);
        Route::post('/delivery-boys', [LaundryOwnerController::class, 'storeDeliveryBoy']);
        Route::post('/delivery-boys/{id}/status', [LaundryOwnerController::class, 'toggleDeliveryBoyStatus']);
        Route::get('/revenue', [LaundryOwnerController::class, 'ownerRevenue']);   // Real-time revenue for this shop
        Route::get('/notifications', [LaundryOwnerController::class, 'notifications']);
    });

    // Support /laundry/ path for backward compatibility
    Route::prefix('laundry')->group(function () {
        Route::post('/register-shop', [LaundryOwnerController::class, 'registerShop']);
        Route::post('/upload-document', [LaundryOwnerController::class, 'uploadDocument']);
        Route::get('/profile', [LaundryOwnerController::class, 'profile']);
        Route::put('/profile', [LaundryOwnerController::class, 'updateProfile']);
        Route::post('/profile', [LaundryOwnerController::class, 'updateProfile']);
        Route::get('/customers', [LaundryOwnerController::class, 'customers']);
        Route::get('/orders', [LaundryOwnerController::class, 'orders']);
        Route::post('/orders/{id}/accept', [LaundryOwnerController::class, 'acceptOrder']);
        Route::post('/orders/{id}/reject', [LaundryOwnerController::class, 'rejectOrder']);
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
        Route::post('/orders/{id}/accept', [DeliveryBoyController::class, 'acceptTask']);
        Route::post('/location', [DeliveryBoyController::class, 'updateLocation']);
        Route::post('/orders/{id}/pickup-verify', [DeliveryBoyController::class, 'verifyPickup']);
        Route::put('/orders/{id}/pickup', [DeliveryBoyController::class, 'verifyPickup']);
        Route::post('/orders/{id}/delivery-verify', [DeliveryBoyController::class, 'verifyDelivery']);
        Route::put('/orders/{id}/deliver', [DeliveryBoyController::class, 'verifyDelivery']);
        Route::put('/assignments/{id}/status', [DeliveryBoyController::class, 'verifyPickup']);
    });

    // ──────────────────────────────────────────────
    // 5. ADMIN WEB PANEL CRUD APIs
    // ──────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/dashboard', [AdminDashboardController::class, 'stats']);
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        
        // Customer Management
        Route::get('/customers', [AdminDashboardController::class, 'customers']);
        Route::post('/customers', [AdminDashboardController::class, 'createCustomer']);
        Route::put('/customers/{id}', [AdminDashboardController::class, 'updateCustomer']);
        Route::delete('/customers/{id}', [AdminDashboardController::class, 'deleteCustomer']);
        Route::post('/customers/{id}/status', [AdminDashboardController::class, 'toggleCustomerStatus']);
        
        // Laundry Shop Management
        Route::get('/laundries', [AdminDashboardController::class, 'laundries']);
        Route::get('/laundry-shops', [AdminDashboardController::class, 'laundries']);
        Route::post('/laundries', [AdminDashboardController::class, 'onboardLaundryShop']);
        Route::post('/laundries/onboard', [AdminDashboardController::class, 'onboardLaundryShop']);
        Route::put('/laundries/{id}', [AdminDashboardController::class, 'updateLaundryShop']);
        Route::delete('/laundries/{id}', [AdminDashboardController::class, 'deleteLaundryShop']);
        Route::post('/laundries/{id}/approve', [AdminDashboardController::class, 'approveLaundry']);
        Route::post('/laundries/{id}/reject', [AdminDashboardController::class, 'rejectLaundry']);
        Route::post('/laundries/{id}/request-docs', [AdminDashboardController::class, 'requestDocs']);
        Route::post('/laundries/{id}/status', [AdminDashboardController::class, 'setStatus']);
        // Services & Items Management
        Route::get('/shop-services', [ShopServiceController::class, 'getServices']);
        Route::post('/shop-services', [ShopServiceController::class, 'createService']);
        Route::put('/shop-services/{id}', [ShopServiceController::class, 'updateService']);
        Route::delete('/shop-services/{id}', [ShopServiceController::class, 'deleteService']);
        Route::post('/shop-services/{id}/status', [ShopServiceController::class, 'toggleServiceStatus']);

        Route::post('/service-items', [ShopServiceController::class, 'createItem']);
        Route::put('/service-items/{id}', [ShopServiceController::class, 'updateItem']);
        Route::delete('/service-items/{id}', [ShopServiceController::class, 'deleteItem']);
        
        // Delivery Boy Management
        Route::get('/delivery-boys', [AdminDashboardController::class, 'deliveryBoys']);
        Route::post('/delivery-boys', [AdminDashboardController::class, 'storeDeliveryBoy']);
        Route::put('/delivery-boys/{id}', [AdminDashboardController::class, 'updateDeliveryBoy']);
        Route::delete('/delivery-boys/{id}', [AdminDashboardController::class, 'deleteDeliveryBoy']);
        Route::post('/delivery-boys/{id}/status', [AdminDashboardController::class, 'toggleDeliveryBoyStatus']);
        
        // Order Management & Override Timeline
        Route::get('/orders', [AdminDashboardController::class, 'orders']);
        Route::get('/orders/{id}', [AdminDashboardController::class, 'showOrder']);
        Route::put('/orders/{id}/status', [AdminDashboardController::class, 'updateOrderStatus']);
        Route::post('/orders/{id}/status', [AdminDashboardController::class, 'updateOrderStatus']);
        
        Route::get('/verifications', [AdminDashboardController::class, 'verifications']);
        Route::post('/verifications/{id}/approve', [AdminDashboardController::class, 'approveLaundry']);
        Route::post('/verifications/{id}/reject', [AdminDashboardController::class, 'rejectLaundry']);
        Route::get('/activity-logs', [AdminDashboardController::class, 'activityLogs']);
        Route::post('/refunds/{id}/process', [AdminDashboardController::class, 'processRefund']);

        // Finance & Payment Ledger (real-time, laundry-wise filterable)
        Route::get('/finance/stats', [AdminDashboardController::class, 'financeStats']);
        Route::get('/finance/transactions', [AdminDashboardController::class, 'financeTransactions']);

        // Reviews, Disputes & Subscription Management
        Route::get('/refunds', [AdminDashboardController::class, 'refunds']);
        Route::post('/refunds/{id}/approve', [AdminDashboardController::class, 'processRefund']);
        Route::get('/reviews', [AdminDashboardController::class, 'reviews']);
        Route::post('/reviews/{id}/status', [AdminDashboardController::class, 'toggleReviewStatus']);
        Route::delete('/reviews/{id}', [AdminDashboardController::class, 'deleteReview']);
        Route::get('/subscriptions/plans', [AdminDashboardController::class, 'subscriptionPlans']);
        Route::post('/subscriptions/plans', [AdminDashboardController::class, 'createSubscriptionPlan']);
        Route::put('/subscriptions/plans/{id}', [AdminDashboardController::class, 'updateSubscriptionPlan']);
        Route::delete('/subscriptions/plans/{id}', [AdminDashboardController::class, 'deleteSubscriptionPlan']);
        Route::get('/subscriptions/subscribers', [AdminDashboardController::class, 'subscribers']);
        Route::get('/admin-users', [AdminDashboardController::class, 'adminUsers']);
        Route::post('/admin-users', [AdminDashboardController::class, 'createAdminUser']);
        Route::get('/audit-logs', [AdminDashboardController::class, 'auditLogs']);
    });
});
