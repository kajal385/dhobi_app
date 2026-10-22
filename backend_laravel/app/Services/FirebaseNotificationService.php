<?php

namespace App\Services;

use App\Models\FcmDeviceToken;
use App\Models\User;
use App\Models\LaundryShop;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseNotificationService
{
    /**
     * Send push notification to a specific user by user_id
     */
    public static function sendToUser(int $userId, string $title, string $body, array $data = []): array
    {
        // 1. Save in user_notifications table for in-app notification center
        self::saveNotificationHistory($userId, $title, $body, $data);

        // 2. Fetch all active device tokens for this user
        $tokens = FcmDeviceToken::where('user_id', $userId)
            ->where('is_active', true)
            ->pluck('token')
            ->toArray();

        // 3. Fallback: match by user's phone number across user records
        if (empty($tokens)) {
            $user = User::find($userId);
            if ($user && !empty($user->phone)) {
                $digits = preg_replace('/\D/', '', (string) $user->phone);
                $last10 = substr($digits, -10);
                if (strlen($last10) === 10) {
                    $matchingUserIds = User::where('phone', 'like', "%{$last10}%")->pluck('id')->toArray();
                    if (!empty($matchingUserIds)) {
                        $tokens = FcmDeviceToken::whereIn('user_id', $matchingUserIds)
                            ->where('is_active', true)
                            ->pluck('token')
                            ->toArray();
                    }
                }
            }
        }

        // 4. Fallback for testing: if customer order update and still empty, notify active customer app devices
        if (empty($tokens) && ($data['channel_id'] ?? '') === 'dhobipro_customer_channel') {
            $tokens = FcmDeviceToken::where('app_type', 'customer')
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->limit(5)
                ->pluck('token')
                ->toArray();
        }

        if (empty($tokens)) {
            Log::info("FCM: No active device tokens found for user ID: {$userId}");
            return ['success' => true, 'sent_count' => 0, 'message' => 'No active devices registered'];
        }

        return self::sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification to the owner of a laundry shop
     */
    public static function sendToShopOwner(int $shopId, string $title, string $body, array $data = []): array
    {
        $shop = LaundryShop::find($shopId);
        if (!$shop) {
            return ['success' => false, 'message' => 'Laundry shop not found'];
        }

        $ownerId = $shop->owner_id;
        if (!$ownerId) {
            // Check by phone
            $cleanPhone = preg_replace('/\D/', '', (string) $shop->phone);
            $last10 = substr($cleanPhone, -10);
            $user = User::where('phone', $shop->phone)
                ->orWhere('phone', $cleanPhone)
                ->orWhere('phone', 'LIKE', '%' . $last10)
                ->first();
            $ownerId = $user ? $user->id : null;
        }

        if ($ownerId) {
            return self::sendToUser($ownerId, $title, $body, array_merge($data, ['shop_id' => (string) $shopId]));
        }

        return ['success' => false, 'message' => 'Shop owner user not found'];
    }

    /**
     * Send push notification to all users of a specific role
     */
    public static function sendToRole(string $role, string $title, string $body, array $data = []): array
    {
        $userIds = User::where('role', strtolower($role))
            ->where('status', 'ACTIVE')
            ->pluck('id')
            ->toArray();

        $totalSent = 0;
        foreach ($userIds as $uid) {
            $res = self::sendToUser($uid, $title, $body, $data);
            $totalSent += $res['sent_count'] ?? 0;
        }

        return ['success' => true, 'sent_count' => $totalSent];
    }

    /**
     * Send push notification to a list of tokens
     */
    public static function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        $results = [];
        $projectId = env('FIREBASE_PROJECT_ID', 'laundry-app-2606a');
        $credentialsPath = env('FIREBASE_CREDENTIALS', storage_path('app/firebase/service-account.json'));
        $serverKey = env('FCM_SERVER_KEY', null);

        // Normalize string data values for FCM protocol
        $stringData = [];
        foreach ($data as $k => $v) {
            $stringData[(string) $k] = is_array($v) ? json_encode($v) : (string) $v;
        }

        foreach ($tokens as $token) {
            try {
                // If service account credentials exist, use HTTP v1 API
                if (file_exists($credentialsPath)) {
                    $res = self::sendViaHttpV1($credentialsPath, $projectId, $token, $title, $body, $stringData);
                } elseif (!empty($serverKey)) {
                    $res = self::sendViaLegacyFcm($serverKey, $token, $title, $body, $stringData);
                } else {
                    // Simulation mode for dev when credentials are not yet uploaded
                    Log::info("FCM [DEV/SIMULATED]: Title: '{$title}', Body: '{$body}', Token: " . substr($token, 0, 15) . "...");
                    $res = ['success' => true, 'simulated' => true];
                }
                $results[] = $res;
            } catch (\Exception $e) {
                Log::error("FCM Exception for token {$token}: " . $e->getMessage());
                $results[] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return [
            'success'    => true,
            'sent_count' => count(array_filter($results, fn($r) => !empty($r['success']))),
            'results'    => $results,
        ];
    }

    /**
     * Send via FCM HTTP v1 API using Google OAuth2 Token
     */
    private static function sendViaHttpV1(string $credentialsPath, string $projectId, string $token, string $title, string $body, array $data): array
    {
        $accessToken = self::getGoogleAccessToken($credentialsPath);
        if (!$accessToken) {
            return ['success' => false, 'error' => 'Failed to generate Google access token'];
        }

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        $payload = [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body'  => $body,
                ],
                'data' => $data,
                'android' => [
                    'priority' => 'high',
                    'notification' => [
                        'channel_id'              => $data['channel_id'] ?? 'dhobipro_orders_channel',
                        'sound'                   => 'notification_sound',
                        'default_sound'           => false,
                        'default_vibrate_timings' => true,
                        'priority'                => 'high',
                        'notification_priority'   => 'PRIORITY_MAX',
                        'visibility'              => 'PUBLIC',
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'sound' => 'notification_sound.wav',
                            'badge' => 1,
                        ],
                    ],
                ],
            ],
        ];

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Content-Type'  => 'application/json',
        ])->post($url, $payload);

        if ($response->successful()) {
            return ['success' => true, 'response' => $response->json()];
        }

        $errBody = $response->json();
        // Deactivate token if unregistered
        if (isset($errBody['error']['status']) && in_array($errBody['error']['status'], ['NOT_FOUND', 'UNREGISTERED'])) {
            FcmDeviceToken::where('token', $token)->update(['is_active' => false]);
            Log::info("FCM: Deactivated stale token: " . substr($token, 0, 15) . "...");
        }

        return ['success' => false, 'error' => $errBody];
    }

    /**
     * Send via FCM Legacy API using Server Key
     */
    private static function sendViaLegacyFcm(string $serverKey, string $token, string $title, string $body, array $data): array
    {
        $url = 'https://fcm.googleapis.com/fcm/send';

        $payload = [
            'to'       => $token,
            'priority' => 'high',
            'notification' => [
                'title'              => $title,
                'body'               => $body,
                'sound'              => 'notification_sound',
                'android_channel_id' => $data['channel_id'] ?? 'dhobipro_orders_channel',
                'priority'           => 'high',
            ],
            'data' => array_merge($data, [
                'title' => $title,
                'body'  => $body,
            ]),
        ];

        $response = Http::withHeaders([
            'Authorization' => 'key=' . $serverKey,
            'Content-Type'  => 'application/json',
        ])->post($url, $payload);

        if ($response->successful()) {
            $json = $response->json();
            if (!empty($json['results'][0]['error']) && in_array($json['results'][0]['error'], ['NotRegistered', 'InvalidRegistration'])) {
                FcmDeviceToken::where('token', $token)->update(['is_active' => false]);
            }
            return ['success' => true, 'response' => $json];
        }

        return ['success' => false, 'error' => $response->body()];
    }

    /**
     * Generate OAuth2 Access Token from Google Service Account JSON without external heavy dependencies
     */
    private static function getGoogleAccessToken(string $credentialsPath): ?string
    {
        $cacheKey = 'fcm_google_access_token';
        if (cache()->has($cacheKey)) {
            return cache()->get($cacheKey);
        }

        try {
            $creds = json_decode(file_get_contents($credentialsPath), true);
            if (!$creds || empty($creds['private_key']) || empty($creds['client_email'])) {
                Log::error("FCM: Invalid service account json file.");
                return null;
            }

            $now = time();
            $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $claimSet = base64_encode(json_encode([
                'iss'   => $creds['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'exp'   => $now + 3600,
                'iat'   => $now,
            ]));

            $header = str_replace(['+', '/', '='], ['-', '_', ''], $header);
            $claimSet = str_replace(['+', '/', '='], ['-', '_', ''], $claimSet);

            $signature = '';
            $binarySignature = '';
            openssl_sign($header . '.' . $claimSet, $binarySignature, $creds['private_key'], 'SHA256');
            $signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($binarySignature));

            $jwt = $header . '.' . $claimSet . '.' . $signature;

            $res = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            if ($res->successful()) {
                $token = $res->json('access_token');
                $expiresIn = $res->json('expires_in', 3500);
                cache()->put($cacheKey, $token, $expiresIn - 100);
                return $token;
            } else {
                Log::error("FCM OAuth2 Error: " . $res->body());
                return null;
            }
        } catch (\Exception $e) {
            Log::error("FCM Token Generation Exception: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Save in user_notifications table
     */
    private static function saveNotificationHistory(int $userId, string $title, string $body, array $data): void
    {
        try {
            DB::table('user_notifications')->insert([
                'user_id'    => $userId,
                'title'      => $title,
                'body'       => $body,
                'type'       => $data['type'] ?? 'order_update',
                'is_read'    => 0,
                'data'       => json_encode($data),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning("Could not insert into user_notifications: " . $e->getMessage());
        }
    }
}
