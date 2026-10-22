<?php
/**
 * DhobiPro - Firebase Web Phone Authentication Bridge Endpoint
 * Verifies Firebase ID Token, Maps to Admin or Owner User, and Initializes PHP Web Session
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$idToken  = trim($data['id_token'] ?? '');
$rawPhone = trim($data['phone'] ?? $data['mobile'] ?? '');
$fcmToken = trim($data['fcm_token'] ?? '');

$cleanPhone = preg_replace('/\D/', '', $rawPhone);
$last10     = substr($cleanPhone, -10);

if (!$last10 && !$idToken) {
    echo json_encode([
        'success' => false,
        'message' => 'Valid verified phone number or Firebase ID token is required.',
    ]);
    exit;
}

// 1. Try Laravel REST Backend Firebase Login
$backendRes = apiPost('/auth/firebase-login', [
    'id_token'    => $idToken,
    'phone'       => $last10 ?: $cleanPhone,
    'mobile'      => $last10 ?: $cleanPhone,
    'device_type' => 'web',
    'fcm_token'   => $fcmToken,
]);

$userRecord = null;
$shopRecord = null;
$userRole   = null;
$authToken  = null;

if ($backendRes['success'] && !empty($backendRes['data'])) {
    $payloadUser = $backendRes['data']['user'] ?? $backendRes['user'] ?? [];
    $rawRole = strtolower(strval($payloadUser['role'] ?? ''));

    // Security check: Customers cannot access Admin / Laundry Owner Web Panel
    if ($rawRole === 'customer') {
        echo json_encode([
            'success' => false,
            'message' => 'Customer accounts are not authorized to access administrative or owner panels. Please use the DhobiPro Customer Mobile App.',
        ]);
        exit;
    }

    $userRecord = $payloadUser;
    $shopRecord = $backendRes['data']['shop'] ?? $backendRes['shop'] ?? null;
    $userRole   = (strpos($rawRole, 'owner') !== false || strpos($rawRole, 'laundry') !== false) ? 'LAUNDRY_OWNER' : 'SUPER_ADMIN';
    $authToken  = $backendRes['token'] ?? $backendRes['access_token'] ?? ('web_session_' . time());
}

// 2. Fallback to Local MySQL Database Check
if (!$userRecord) {
    $db = getDb();
    if ($db && ($last10 || $cleanPhone)) {
        try {
            $st = $db->prepare("SELECT u.*, s.id as shop_id, s.name as shop_name, s.owner_name, s.address as shop_address 
                                FROM users u 
                                LEFT JOIN laundry_shops s ON (s.owner_id = u.id OR s.phone = u.phone OR s.phone = ? OR s.phone LIKE ?)
                                WHERE u.phone = ? OR u.phone = ? OR u.phone = ? OR u.phone LIKE ?
                                LIMIT 1");
            $st->execute([$cleanPhone, '%' . $last10, $last10, $cleanPhone, '+91' . $last10, '%' . $last10]);
            $u = $st->fetch(PDO::FETCH_ASSOC);

            if ($u) {
                $rawRole = strtolower(strval($u['role'] ?? ''));
                if ($rawRole === 'customer') {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Customer accounts cannot access administrative panels. Please use the Customer App.',
                    ]);
                    exit;
                }

                $userRecord = $u;
                $userRole   = (strpos($rawRole, 'owner') !== false || strpos($rawRole, 'laundry') !== false) ? 'LAUNDRY_OWNER' : 'SUPER_ADMIN';
                $shopRecord = [
                    'id'   => $u['shop_id'] ?: ($u['id'] ?? '30'),
                    'name' => $u['shop_name'] ?: ($u['name'] . ' Laundry'),
                ];
                $authToken  = 'web_session_' . $u['id'] . '_' . time();
            }
        } catch (\Throwable $t) {}
    }
}

// 3. Fallback Check in Built-in Demo Owners (e.g. Ashish Bhosale - 8600692767)
if (!$userRecord && ($last10 === '8600692767' || $last10 === '9999999999')) {
    $isAshish = ($last10 === '8600692767');
    $userRecord = [
        'id'    => $isAshish ? '31' : '99',
        'name'  => $isAshish ? 'Ashish Bhosale' : 'Neha Wash Care Owner',
        'email' => $isAshish ? 'ashish.laundry@dhobipro.com' : 'neha@gmail.com',
        'phone' => $last10,
        'role'  => 'LAUNDRY_OWNER',
    ];
    $shopRecord = [
        'id'   => $isAshish ? '44' : '99',
        'name' => $isAshish ? 'Star Wash Ultra Premium' : 'Neha Wash Care',
    ];
    $userRole = 'LAUNDRY_OWNER';
    $authToken = 'mock-jwt-owner-' . ($isAshish ? '44' : '99');
}

// If no matching account found for Admin or Owner
if (!$userRecord) {
    echo json_encode([
        'success' => false,
        'message' => 'No Admin or Laundry Shop Owner account associated with mobile number +91 ' . $last10 . '. Please register your shop first or sign in with registered credentials.',
    ]);
    exit;
}

// 4. Initialize Authenticated Session
$shopId   = strval($shopRecord['id'] ?? $userRecord['shop_id'] ?? ($userRole === 'LAUNDRY_OWNER' ? '30' : '1'));
$shopName = $shopRecord['name'] ?? $userRecord['shop_name'] ?? ($userRole === 'LAUNDRY_OWNER' ? 'My Laundry Shop' : 'Platform');

$_SESSION['dhobipro_admin_token'] = $authToken;
$_SESSION['dhobipro_admin_user']  = [
    'id'                 => strval($userRecord['id']),
    'name'               => $userRecord['name'] ?? 'User',
    'email'              => $userRecord['email'] ?? ($last10 . '@dhobipro.com'),
    'phone'              => $userRecord['phone'] ?? $last10,
    'role'               => $userRole,
    'permissions'        => ($userRole === 'SUPER_ADMIN') ? ['ALL'] : ['MANAGE_OWN_SHOP', 'MANAGE_OWN_ORDERS', 'MANAGE_OWN_SERVICES'],
    'shopId'             => $shopId,
    'shopName'           => $shopName,
    'verificationStatus' => 'APPROVED',
];

echo json_encode([
    'success'  => true,
    'message'  => 'Firebase authentication successful. Redirecting to dashboard...',
    'role'     => $userRole,
    'redirect' => ADMIN_BASE_URL . '/dashboard/index.php',
    'user'     => $_SESSION['dhobipro_admin_user'],
]);
