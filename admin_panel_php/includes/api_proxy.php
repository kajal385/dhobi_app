<?php
/**
 * DhobiPro Admin Panel - AJAX REST API Proxy & Relay
 * 
 * Enables seamless client-side AJAX/fetch communication with the Laravel backend.
 * Automatically injects the session's Sanctum Bearer token and avoids CORS issues.
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/api-client.php';

// Check if user is authenticated (except for public auth check)
$endpoint = $_GET['endpoint'] ?? $_POST['endpoint'] ?? '';
if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'API endpoint parameter is required.']);
    exit;
}

// Ensure protected endpoints require auth
if (strpos($endpoint, '/auth/login') === false && !isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized session. Please login.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Parse request payload
$input = null;
if ($method !== 'GET') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if ($input === null && !empty($_POST)) {
        $input = $_POST;
        unset($input['endpoint']);
    }
} else {
    $input = $_GET;
    unset($input['endpoint']);
}

// Forward to backend
$token = currentToken();
$response = apiClientRequest($method, $endpoint, $input, $token);

http_response_code($response['status'] ?? 200);
echo json_encode($response['data'] ?? ['success' => $response['success'], 'message' => $response['error']]);
exit;
