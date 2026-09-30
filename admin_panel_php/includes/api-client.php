<?php
/**
 * DhobiPro Admin Panel - Reusable cURL REST API Client
 * 
 * Securely communicates with the Laravel 12 REST API.
 * Attaches Sanctum Bearer tokens, JSON headers, handles errors, and parses responses.
 */

require_once __DIR__ . '/../config/api.php';

if (!function_exists('apiClientRequest')) {
    function apiClientRequest(string $method, string $endpoint, $data = null, ?string $token = null, bool $isMultipart = false): array {
        $token = $token ?? ($_SESSION['dhobipro_admin_token'] ?? null);

        // Normalize endpoint URL
        $url = rtrim(API_BASE_URL, '/') . '/' . ltrim($endpoint, '/');

        // If GET and data is array, append as query parameters
        if (strtoupper($method) === 'GET' && is_array($data) && !empty($data)) {
            $queryString = http_build_query($data);
            $url .= (strpos($url, '?') === false ? '?' : '&') . $queryString;
            $data = null;
        }

        $ch = curl_init();

        $headers = [
            'Accept: application/json',
        ];

        if ($token) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }

        if (!$isMultipart) {
            $headers[] = 'Content-Type: application/json';
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

        if (!empty($data) && strtoupper($method) !== 'GET') {
            if ($isMultipart) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            } else {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($responseBody === false || !empty($curlError)) {
            return [
                'success' => false,
                'status' => $httpCode ?: 500,
                'data' => null,
                'error' => $curlError ?: 'Connection to API server timed out or failed.',
                'raw' => null,
            ];
        }

        $decoded = json_decode($responseBody, true);

        return [
            'success' => ($httpCode >= 200 && $httpCode < 300),
            'status' => $httpCode,
            'data' => $decoded,
            'error' => ($httpCode >= 400) ? ($decoded['message'] ?? 'API error with code ' . $httpCode) : null,
            'raw' => $responseBody,
        ];
    }
}

if (!function_exists('apiGet')) {
    function apiGet(string $endpoint, array $params = [], ?string $token = null): array {
        return apiClientRequest('GET', $endpoint, $params, $token);
    }
}

if (!function_exists('apiPost')) {
    function apiPost(string $endpoint, $data = [], ?string $token = null, bool $isMultipart = false): array {
        return apiClientRequest('POST', $endpoint, $data, $token, $isMultipart);
    }
}

if (!function_exists('apiPut')) {
    function apiPut(string $endpoint, $data = [], ?string $token = null): array {
        return apiClientRequest('PUT', $endpoint, $data, $token);
    }
}

if (!function_exists('apiPatch')) {
    function apiPatch(string $endpoint, $data = [], ?string $token = null): array {
        return apiClientRequest('PATCH', $endpoint, $data, $token);
    }
}

if (!function_exists('apiDelete')) {
    function apiDelete(string $endpoint, $data = [], ?string $token = null): array {
        return apiClientRequest('DELETE', $endpoint, $data, $token);
    }
}

if (!function_exists('apiExtractList')) {
    /**
     * Safely extract a list of items from a Laravel API response.
     * Handles Laravel pagination, resource wrappers, and nested keys.
     */
    function apiExtractList(array $apiResponse, string $key = null): array {
        if (empty($apiResponse['success']) || empty($apiResponse['data'])) {
            return [];
        }
        $data = $apiResponse['data'];

        // If specific key requested
        if ($key && isset($data[$key]) && is_array($data[$key])) {
            return $data[$key];
        }

        // Handle standard Laravel ['status' => true, 'data' => [...]] wrapper
        if (isset($data['data']) && is_array($data['data'])) {
            // If paginated, data['data'] is the items array
            if ($key && isset($data['data'][$key]) && is_array($data['data'][$key])) {
                return $data['data'][$key];
            }
            $sub = $data['data'];
            // Check if sub items are arrays
            if (is_array($sub) && (empty($sub) || isset($sub[0]))) {
                return $sub;
            }
            return $sub;
        }

        // Check if $data itself is a sequential list of records
        if (is_array($data) && (empty($data) || isset($data[0]))) {
            return $data;
        }

        return [];
    }
}

