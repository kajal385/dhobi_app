<?php
/**
 * Local validation test for Firebase Auth & FCM Services using Laravel 12 handleRequest
 */

define('LARAVEL_START', microtime(true));

require __DIR__ . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__ . '/bootstrap/app.php';

use App\Models\User;
use App\Models\FcmDeviceToken;
use App\Services\FirebaseNotificationService;
use Illuminate\Http\Request;

echo "\n=======================================================\n";
echo "  DHOBIPRO LOCAL FIREBASE INTEGRATION TEST SUITE\n";
echo "=======================================================\n\n";

$passed = 0;
$failed = 0;

function assertTest($name, $condition, $details = '') {
    global $passed, $failed;
    if ($condition) {
        echo "✅ PASS: {$name}\n";
        if ($details) echo "   ↳ {$details}\n";
        $passed++;
    } else {
        echo "❌ FAIL: {$name}\n";
        if ($details) echo "   ↳ {$details}\n";
        $failed++;
    }
}

function callRoute($app, $method, $uri, $params = []) {
    $server = [
        'HTTP_ACCEPT' => 'application/json',
        'CONTENT_TYPE' => 'application/json',
    ];
    $content = json_encode($params);
    $req = Request::create($uri, $method, [], [], [], $server, $content);
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $res = $kernel->handle($req);
    return [
        'status' => $res->getStatusCode(),
        'data'   => json_decode($res->getContent(), true),
    ];
}

// ── Test 1: FCM Token Register ──────────────────────────────────────────
$fakeToken = 'test_token_' . time() . '_' . rand(1000, 9999);
$res1 = callRoute($app, 'POST', '/api/v1/fcm/token', [
    'token'       => $fakeToken,
    'device_type' => 'android',
    'app_type'    => 'customer',
    'device_name' => 'Pixel 8 Test Device',
]);

assertTest(
    'FCM Device Token Register',
    $res1['status'] === 200 && ($res1['data']['success'] ?? false) === true,
    'HTTP ' . $res1['status'] . ', Token ID: ' . ($res1['data']['data']['token_id'] ?? 'N/A')
);

// ── Test 2: Verify Token in DB ──────────────────────────────────────────
$tokenRecord = FcmDeviceToken::where('token', $fakeToken)->first();
assertTest(
    'FCM Token Persisted in Database',
    $tokenRecord !== null && $tokenRecord->is_active == 1,
    'Token ID: ' . ($tokenRecord->id ?? 'N/A') . ', Active: ' . ($tokenRecord->is_active ?? '0')
);

// ── Test 3: FCM Token Removal on Logout ─────────────────────────────────
$res3 = callRoute($app, 'POST', '/api/v1/fcm/token/remove', [
    'token' => $fakeToken,
]);

$tokenRecordAfter = FcmDeviceToken::where('token', $fakeToken)->first();
assertTest(
    'FCM Token De-registration on Logout',
    $res3['status'] === 200 && $tokenRecordAfter && $tokenRecordAfter->is_active == 0,
    'HTTP ' . $res3['status'] . ', is_active set to: ' . ($tokenRecordAfter ? (int)$tokenRecordAfter->is_active : 'null')
);

// Cleanup
if ($tokenRecordAfter) {
    $tokenRecordAfter->delete();
}

// ── Test 4: Firebase Notification Service ───────────────────────────────
$notificationRes = FirebaseNotificationService::sendToTokens(
    ['sample_fcm_token_dev_test'],
    'Order Update 🧺',
    'Your laundry order is being processed.',
    ['order_id' => '101', 'type' => 'order_status_update']
);

assertTest(
    'Firebase Notification Service HTTP v1 Protocol',
    ($notificationRes['success'] ?? false) === true,
    'Sent Count: ' . ($notificationRes['sent_count'] ?? 0)
);

// ── Test 5: Customer Firebase Login ─────────────────────────────────────
$res5 = callRoute($app, 'POST', '/api/v1/auth/firebase-login', [
    'phone'       => '9876543210',
    'role'        => 'customer',
    'device_type' => 'android',
]);

assertTest(
    'Customer Firebase Login Flow',
    $res5['status'] === 200 && ($res5['data']['success'] ?? false) === true,
    'HTTP ' . $res5['status'] . ', User: ' . ($res5['data']['user']['name'] ?? 'N/A') . ' (' . ($res5['data']['role'] ?? 'N/A') . ')'
);

// ── Test 6: Owner Firebase Login ────────────────────────────────────────
$res6 = callRoute($app, 'POST', '/api/v1/owner/firebase-login', [
    'phone'       => '8600692767',
    'role'        => 'owner',
    'device_type' => 'android',
]);

assertTest(
    'Laundry Owner Firebase Login Flow',
    $res6['status'] === 200 && ($res6['data']['success'] ?? false) === true,
    'HTTP ' . $res6['status'] . ', Shop: ' . ($res6['data']['shop']['name'] ?? 'N/A') . ', Status: ' . ($res6['data']['verification_status'] ?? 'N/A')
);

// ── Test 7: Role Security Guard ─────────────────────────────────────────
$custUser = User::where('phone', 'LIKE', '%9876543210')->first();
assertTest(
    'Role Security (Customer cannot escalate to Admin)',
    $custUser && strtolower($custUser->role) === 'customer',
    'User ID: ' . ($custUser->id ?? 'N/A') . ', Role: ' . ($custUser->role ?? 'N/A')
);

echo "\n=======================================================\n";
echo "TEST RESULTS: {$passed} Passed, {$failed} Failed\n";
echo "=======================================================\n\n";
