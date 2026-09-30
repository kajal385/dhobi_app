<?php
// Test all customer app endpoints
$base = 'http://127.0.0.1/dhobi_backend/public/api/v1';

function test($label, $url, $method = 'GET', $body = null) {
    $opts = ['http' => ['method' => $method, 'header' => "Content-Type: application/json\r\nAccept: application/json", 'ignore_errors' => true]];
    if ($body) $opts['http']['content'] = json_encode($body);
    $ctx = stream_context_create($opts);
    $res = @file_get_contents($url, false, $ctx);
    $code = '???';
    if (isset($http_response_header)) {
        preg_match('/HTTP\/\S+ (\d+)/', $http_response_header[0], $m);
        $code = $m[1] ?? '???';
    }
    $data = $res ? json_decode($res, true) : null;
    $success = $data['success'] ?? false;
    $count = is_array($data['data'] ?? null) ? count($data['data']) : 'N/A';
    $err = $data['message'] ?? ($res ? substr($res, 0, 100) : 'No response');
    echo "[$code] $label → success=" . ($success ? 'true' : 'false') . ", count=$count, msg=$err\n";
}

echo "=== CUSTOMER APP API TESTS ===\n\n";

// Auth
test('Send OTP', "$base/auth/send-otp", 'POST', ['mobile' => '9999999999']);
test('Verify OTP', "$base/auth/verify-otp", 'POST', ['mobile' => '9999999999', 'otp' => '123456']);

// Shops
test('Get Shops (list)',    "$base/shops");
test('Get Shop #30',       "$base/shops/30");
test('Popular Shops',      "$base/shops/popular");
test('Nearby Shops',       "$base/shops/nearby?lat=18.55&lng=73.78");

// Orders
test('Get Orders (user_id=34)', "$base/orders?user_id=34");
test('Create Order (POST)', "$base/orders", 'POST', [
    'shop_id' => 30, 'user_id' => 34,
    'total_amount' => 350, 'subtotal' => 350,
    'payment_method' => 'upi', 'payment_status' => 'pending',
    'pickup_address' => 'Test Address, Pune',
    'pickup_date' => '2026-09-11', 'delivery_date' => '2026-09-13',
    'items' => [['name' => 'T-Shirt', 'quantity' => 3, 'price' => 50, 'total' => 150]]
]);

// Categories
test('Categories', "$base/categories");

echo "\n=== DONE ===\n";
