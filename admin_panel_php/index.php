<?php
require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/includes/auth.php';

if (isLoggedIn()) {
    header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
} else {
    header('Location: ' . ADMIN_BASE_URL . '/auth/login.php');
}
exit;
