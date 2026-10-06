<?php
/**
 * DhobiPro Admin Panel - Centralized API & Platform Configuration
 * 
 * All API communications with the Laravel 12 backend route through this configuration.
 * DO NOT hardcode API URLs in individual PHP pages.
 */

// Start session if not already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['custom_shops'])) {
    $_SESSION['custom_shops'] = [];
}
// Seed Neha Wash Care globally once so she is mutable
$hasNeha = false;
foreach ($_SESSION['custom_shops'] as $cs) {
    if ($cs['email'] === 'neha@gmail.com') $hasNeha = true;
}
if (!$hasNeha) {
    $_SESSION['custom_shops'][] = [
        'id' => '99',
        'shop_id' => '99',
        'shopName' => 'Neha Wash Care',
        'ownerName' => 'Neha',
        'phone' => '9999999999',
        'email' => 'neha@gmail.com',
        'password' => 'Dhobi@1130',
        'city' => 'Pune',
        'address' => 'New City Center, Pune',
        'verificationStatus' => 'PENDING',
        'accountStatus' => 'ACTIVE',
        'gstNumber' => 'PENDING',
        'bankName' => 'State Bank',
        'bankAccount' => 'XXXXXXXX1234',
        'ifscCode' => 'SBIN0001234',
        'idProofNumber' => 'AADHAAR-PENDING',
        'idProofPhoto' => 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?auto=format&fit=crop&w=400&q=80',
        'businessProofPhoto' => 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80',
        'bankProofPhoto' => 'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?auto=format&fit=crop&w=400&q=80',
        'shopBoardPhoto' => 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80'
    ];
}

$hasStarWash = false;
foreach ($_SESSION['custom_shops'] as $cs) {
    if ($cs['email'] === 'ashish.laundry@dhobipro.com') $hasStarWash = true;
}
if (!$hasStarWash) {
    $_SESSION['custom_shops'][] = [
        'id' => '44',
        'shop_id' => '44',
        'shopName' => 'Star Wash Ultra Premium',
        'ownerName' => 'Ashish Bhosale',
        'phone' => '8600692767',
        'email' => 'ashish.laundry@dhobipro.com',
        'password' => 'owner123',
        'city' => 'Tathawade, Pune',
        'address' => 'Highway bypass, Shankar Kalat Nagar, Bhujbal Chowk, Tathawade, Mulshi Subdistrict, Pune District, Maharashtra, 411057, India',
        'totalOrders' => 14,
        'revenue' => 18450,
        'rating' => 4.9,
        'verificationStatus' => 'APPROVED',
        'accountStatus' => 'ACTIVE',
        'workingHours' => '08:00 AM - 09:30 PM',
        'pickupRadiusKm' => 8,
        'gstNumber' => '27AABCU9603R1ZM',
        'bankName' => 'HDFC Bank',
        'bankAccount' => '50100987654321',
        'ifscCode' => 'HDFC0001234',
        'upiId' => '8600692767@hdfcbank',
        'idProofNumber' => '5421 8765 4321',
        'idProofPhoto' => '',
        'businessProofNumber' => 'UDYAM-MH-12-0000000',
        'businessProofPhoto' => '',
        'bankProofPhoto' => '',
        'shopBoardPhoto' => '',
        'logo_url' => '',
        'cover_url' => '',
    ];
}

// Silence notices and warnings in visual UI
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);
ini_set('display_errors', '0');

// Determine Host & Environment dynamically (strip port if any)
$rawHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
$hostOnly = explode(':', $rawHost)[0];
$isLocal = in_array($hostOnly, ['localhost', '127.0.0.1', '::1', '192.168.1.14', '192.168.1.15']);

// Define Base URLs
if (!defined('API_BASE_URL')) {
    // You can override this with your specific Laravel deployment URL
    if ($isLocal) {
        define('API_BASE_URL', 'http://127.0.0.1:8000/api/v1');
    } else {
        define('API_BASE_URL', 'https://dhobi-api.bizz-manager.com/public/api/v1');
    }
}

if (!defined('APP_NAME')) {
    define('APP_NAME', 'DhobiPro');
}

if (!defined('APP_VERSION')) {
    define('APP_VERSION', '1.0.0');
}

if (!defined('APP_TAGLINE')) {
    define('APP_TAGLINE', 'Complete Laundry Management Platform');
}

// Base Path for Admin Panel (Relative web root calculation)
if (!defined('ADMIN_BASE_URL')) {
    if (!$isLocal) {
        define('ADMIN_BASE_URL', 'https://dhobi-admin.bizz-manager.com');
    } else {
        $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
        // Check if running in a subdirectory containing /admin_panel_php (e.g. XAMPP htdocs/admin_panel_php)
        $pos = strpos($scriptName, '/admin_panel_php');
        if ($pos !== false) {
            define('ADMIN_BASE_URL', substr($scriptName, 0, $pos + strlen('/admin_panel_php')));
        } else {
            // Document root is the admin panel folder itself (e.g. php -S 127.0.0.1:8080 or dedicated virtual host)
            define('ADMIN_BASE_URL', '');
        }
    }
}
