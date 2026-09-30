<?php
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/api-client.php';

// Notify backend if logged in
if (isLoggedIn()) {
    try {
        apiPost('/auth/logout');
    } catch (\Throwable $e) {
        // Ignore network errors on logout
    }
}

// Clear PHP auth session data only (Preserve mock databases)
unset($_SESSION['dhobipro_admin_token']);
unset($_SESSION['dhobipro_admin_user']);
// Do NOT call session_destroy() so that 'custom_shops' and 'doc_requests' persist for the demo

header('Location: ' . ADMIN_BASE_URL . '/auth/login.php');
exit;
