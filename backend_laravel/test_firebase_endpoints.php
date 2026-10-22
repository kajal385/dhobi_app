<?php
/**
 * Test script for newly integrated Firebase Authentication & FCM endpoints
 * Usage: php test_firebase_endpoints.php [optional-base-url]
 */

$base = $argv[1] ?? 'http://127.0.0.1:8000/api/v1';

function testEndpoint($name, $url, $method = 'GET', $body = null) {
    echo str_pad("Testing [{$method}] {$name}...", 55);
    $opts = [
        'http' => [
            'method'  => $method,
            'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'timeout' => 5,
            'ignore_errors' => true,
        ]
    ];
    if ($body !== null) {
        $opts['http']['content'] = json_encode($body);
    }

    $ctx = stream_context_create($opts);
    $start = microtime(true);
    $response = @file_get_contents($url, false, $ctx);
    $duration = round((microtime(true) - $start) * 1000);

    if ($response === false) {
        echo "❌ CONNECTION FAILED (Is server running?)\n";
        return;
    }

    $status = 0;
    if (isset($http_response_header[0]) && preg_match('/HTTP\/\S+\s+(\d+)/', $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    $data = json_decode($response, true);
    $isSuccess = $status >= 200 && $status < 300 && ($data['success'] ?? false);

    if ($isSuccess) {
        echo "✅ PASS (HTTP {$status}, {$duration}ms)\n";
        if (!empty($data['message'])) {
            echo "   ↳ Message: " . $data['message'] . "\n";
        }
    } else {
        echo "⚠️  STATUS {$status} ({$duration}ms)\n";
        echo "   ↳ Response: " . substr($response, 0, 120) . "\n";
    }
}

echo "\n=======================================================\n";
echo "  DHOBIPRO FIREBASE AUTH & PUSH NOTIFICATION API TESTS \n";
echo "  Target URL: {$base}\n";
echo "=======================================================\n\n";

// 1. Customer Firebase Login
testEndpoint('Customer Firebase Login', "{$base}/auth/firebase-login", 'POST', [
    'phone'       => '9999999999',
    'role'        => 'customer',
    'device_type' => 'android',
    'fcm_token'   => 'test_fcm_token_device_abc123',
]);

// 2. FCM Device Token Registration
testEndpoint('FCM Device Token Register', "{$base}/fcm/token", 'POST', [
    'token'       => 'sample_fcm_token_registration_1234567890',
    'device_type' => 'android',
    'app_type'    => 'customer',
    'device_name' => 'Pixel 7 Test Device',
]);

// 3. FCM Device Token Removal
testEndpoint('FCM Device Token Remove', "{$base}/fcm/token/remove", 'POST', [
    'token' => 'sample_fcm_token_registration_1234567890',
]);

// 4. Owner Firebase Login
testEndpoint('Owner Firebase Login', "{$base}/owner/firebase-login", 'POST', [
    'phone'       => '8600692767',
    'role'        => 'owner',
    'device_type' => 'android',
]);

// 5. Admin Push Broadcast
testEndpoint('Admin Push Broadcast', "{$base}/admin/broadcast", 'POST', [
    'title'    => 'Special Festive Discount! 👕✨',
    'body'     => 'Flat 20% off on all dry cleaning and express services today.',
    'audience' => 'ALL_CUSTOMERS',
]);

echo "\n=======================================================\n";
echo "Tests completed.\n\n";
