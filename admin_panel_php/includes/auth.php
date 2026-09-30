<?php
/**
 * DhobiPro Admin Panel - Authentication & Session Management Helper
 */

require_once __DIR__ . '/../config/api.php';

if (!function_exists('isLoggedIn')) {
    function isLoggedIn(): bool {
        return !empty($_SESSION['dhobipro_admin_token']) && !empty($_SESSION['dhobipro_admin_user']);
    }
}

if (!function_exists('currentUser')) {
    function currentUser(): ?array {
        return $_SESSION['dhobipro_admin_user'] ?? null;
    }
}

if (!function_exists('currentToken')) {
    function currentToken(): ?string {
        return $_SESSION['dhobipro_admin_token'] ?? null;
    }
}

if (!function_exists('isSuperAdmin')) {
    function isSuperAdmin(): bool {
        $user = currentUser();
        if (!$user) return false;
        $role = strtoupper($user['role'] ?? '');
        return ($role === 'SUPER_ADMIN' || $role === 'ADMIN');
    }
}

if (!function_exists('isLaundryOwner')) {
    function isLaundryOwner(): bool {
        $user = currentUser();
        if (!$user) return false;
        $role = strtoupper($user['role'] ?? '');
        return ($role === 'LAUNDRY_OWNER' || strpos($role, 'OWNER') !== false);
    }
}

if (!function_exists('currentShopId')) {
    function currentShopId(): ?string {
        $user = currentUser();
        return $user['shopId'] ?? $user['shop_id'] ?? null;
    }
}

if (!function_exists('currentShopName')) {
    function currentShopName(): string {
        $user = currentUser();
        return $user['shopName'] ?? $user['shop_name'] ?? 'My Laundry Shop';
    }
}

if (!function_exists('currentUserPhone')) {
    function currentUserPhone(): string {
        $user = currentUser();
        return $user['phone'] ?? $user['mobile'] ?? '';
    }
}

if (!function_exists('requireAuth')) {
    function requireAuth(string $redirectPath = null) {
        if (!isLoggedIn()) {
            $loginUrl = $redirectPath ?? (ADMIN_BASE_URL . '/auth/login.php');
            header("Location: $loginUrl");
            exit;
        }

        // Force unverified laundry owners to the dashboard/verification screen
        $user = currentUser();
        $isOwner = isLaundryOwner();
        $isPending = ($isOwner && ($user['verificationStatus'] ?? 'APPROVED') === 'PENDING');
        
        $currentUri = $_SERVER['REQUEST_URI'];
        $isDashboard = strpos($currentUri, '/dashboard/index.php') !== false || strpos($currentUri, '/auth/logout.php') !== false;

        if ($isPending && !$isDashboard) {
            header("Location: " . ADMIN_BASE_URL . "/dashboard/index.php");
            exit;
        }
    }
}
